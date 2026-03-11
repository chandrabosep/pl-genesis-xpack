"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	useAccount,
	useSendTransaction,
	useSwitchChain,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { AlertCircle, Wallet, Hash } from "lucide-react";
import {
	SUI_DECIMALS,
	PAYMENT_TOKEN_DECIMALS,
	FLOW_EVM_TESTNET_CHAIN_ID,
	getBlockExplorerTxUrl,
	getSuiTestnetTxUrl,
	getStarknetSepoliaTxUrl,
	getStarknetRpcUrl,
} from "@/lib/x402/payment-config";
import { connect as connectStarknet } from "starknetkit";
import { cairo, RpcProvider, WalletAccount } from "starknet";
import { CopyButton } from "@/components/ui/copy-button";
import { Button } from "@/components/ui/button";
import {
	ConnectModal,
	useCurrentWallet,
	useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import "@mysten/dapp-kit/dist/index.css";

const ERC20_TRANSFER_ABI = [
	{
		type: "function" as const,
		name: "transfer",
		stateMutability: "nonpayable" as const,
		inputs: [
			{ name: "to", type: "address" },
			{ name: "amount", type: "uint256" },
		],
		outputs: [{ type: "bool" }],
	},
] as const;

/** Explicit gas limits to avoid RPC gas estimation returning null (viem destructure error). */
const GAS_ERC20_TRANSFER = BigInt(65_000);

const BASE_SEPOLIA_CHAIN_ID = 84532;


const MAX_ERROR_CHARS = 80;

/** Short, user-friendly message for contract revert and other long RPC errors. Never returns long or raw call data. */
function shortContractError(message: string | undefined): string {
	if (!message || typeof message !== "string")
		return "Transaction failed. Try again.";
	// Hide raw viem/RPC revert blobs (hex data, gas, nonce, etc.)
	if (
		/execution reverted|Raw Call Arguments|data: 0x|maxFeePerGas|nonce: \d+/i.test(
			message,
		)
	)
		return "Transaction reverted on-chain.";
	if (message.includes("gasLimit") || message.includes("destructure"))
		return "Transaction could not be prepared. Check network and balance, then try again.";
	if (message.length > MAX_ERROR_CHARS)
		return `${message.slice(0, MAX_ERROR_CHARS - 1)}…`;
	return message;
}

/** True when the wallet user rejected/cancelled the transaction (e.g. MetaMask "Reject"). */
function isUserRejectedRequestError(err: unknown): boolean {
	if (!err || typeof err !== "object") return false;
	const msg =
		"message" in err &&
		typeof (err as { message?: string }).message === "string"
			? (err as { message: string }).message
			: "";
	const name = "name" in err ? String((err as { name?: string }).name) : "";
	const code = "code" in err ? String((err as { code?: string }).code) : "";
	return (
		code === "ACTION_REJECTED" ||
		name === "UserRejectedRequestError" ||
		/user rejected the request/i.test(msg) ||
		/user denied transaction signature/i.test(msg) ||
		/request was rejected/i.test(msg)
	);
}

type PaymentOption = {
	chainId: number;
	paymentUri: string;
	tokenAddress: string;
	chainName: string;
};

type SuiPaymentOption = {
	amountSui: string;
	suiAddress: string;
	currency: string;
	network: "mainnet" | "testnet";
};

type StarknetPaymentOption = {
	amountUsdc: string;
	starknetAddress: string;
	currency: string;
	network: "sepolia";
	starknetUsdcAddress?: string;
};

type FlowPaymentOption = {
	amountFlow: string;
	amountFlowWei: string;
	flowAddress: string;
	currency: string;
	chainId: number;
};

type ReadyPayload = {
	price: number;
	address: string;
	projectName?: string;
	sessionToken: string;
	paymentUri?: string;
	chainId?: number;
	currency?: string;
	tokenAddress?: string;
	amountUnits?: string;
	pricingModel?: string;
	githubUsername?: string;
	githubUserId?: string;
	receiveMode?: "base" | "sui" | "starknet" | "flow";
	paymentOptions?: PaymentOption[];
	suiPaymentOption?: SuiPaymentOption;
	starknetPaymentOption?: StarknetPaymentOption;
	flowPaymentOption?: FlowPaymentOption;
};

type SessionState =
	| { status: "loading" }
	| { status: "invalid"; error: string }
	| ({ status: "ready" } & ReadyPayload)
	| ({ status: "confirming" } & ReadyPayload) // tx submitted, waiting for block
	| ({ status: "verifying" } & ReadyPayload) // tx mined, checking on our server
	| ({
			status: "verified";
			transactionHash?: string;
			chainId?: number;
			transactionDigest?: string;
			suiNetwork?: "mainnet" | "testnet";
	  })
	| { status: "verify_error"; error: string };

export default function PayPage() {
	const searchParams = useSearchParams();
	const sessionParam = searchParams.get("session");
	const [state, setState] = useState<SessionState>({ status: "loading" });
	const payingForSessionRef = useRef<string | null>(null);
	const readyPayloadRef = useRef<ReadyPayload | null>(null);
	// For subscription: GitHub username when missing from session (user enters on pay page)
	const [githubUsername, setGithubUsername] = useState("");
	const [githubSaved, setGithubSaved] = useState(false);
	const [githubSaving, setGithubSaving] = useState(false);
	const [githubError, setGithubError] = useState<string | null>(null);
	const [suiVerifyDigest, setSuiVerifyDigest] = useState("");
	const [suiVerifying, setSuiVerifying] = useState(false);
	const [suiVerifyError, setSuiVerifyError] = useState<string | null>(null);
	const [starknetVerifyHash, setStarknetVerifyHash] = useState("");
	const [starknetVerifying, setStarknetVerifying] = useState(false);
	const [starknetVerifyError, setStarknetVerifyError] = useState<string | null>(
		null,
	);
	const [starknetAccount, setStarknetAccount] = useState<{
		execute: (calls: unknown[]) => Promise<{ transaction_hash: string }>;
	} | null>(null);
	const [starknetPayPending, setStarknetPayPending] = useState(false);
	const [starknetPayError, setStarknetPayError] = useState<string | null>(null);
	const [suiConnectOpen, setSuiConnectOpen] = useState(false);
	const [suiPayError, setSuiPayError] = useState<string | null>(null);
	const [flowSendHash, setFlowSendHash] = useState<string | undefined>(undefined);
	const suiWallet = useCurrentWallet();
	const { mutateAsync: signAndExecuteSui, isPending: suiSignPending } =
		useSignAndExecuteTransaction();

	const { isConnected, chain } = useAccount();
	const { switchChainAsync } = useSwitchChain();
	const { open } = useAppKit();
	const {
		writeContract,
		data: txHash,
		isPending: isWritePending,
		error: writeError,
		isError: isWriteError,
		reset: resetWriteContract,
	} = useWriteContract();

	const { sendTransactionAsync, isPending: isSendPending } = useSendTransaction();

	// Wait for tx to be mined before we call verify (EVM: writeContract hash or Flow native send hash)
	const pendingEvmHash = flowSendHash ?? txHash ?? undefined;
	const {
		data: receipt,
		isSuccess: isReceiptSuccess,
		isError: isReceiptError,
		error: receiptError,
	} = useWaitForTransactionReceipt({ hash: pendingEvmHash as `0x${string}` });

	const paymentUri =
		state.status === "ready" ||
		state.status === "confirming" ||
		state.status === "verifying"
			? state.paymentUri
			: undefined;
	// When tx is submitted, show "Confirming…" (waiting for block)
	useEffect(() => {
		if (!txHash || !payingForSessionRef.current) return;
		const payload = readyPayloadRef.current;
		if (!payload) return;
		// Only set confirming if we're still in ready (avoid overwriting verifying/verified)
		setState((s) =>
			s.status === "ready" ? { ...payload, status: "confirming" } : s,
		);
	}, [txHash]);

	// When tx was submitted but reverted on-chain, return to ready so user can retry
	useEffect(() => {
		if (!isReceiptError || !receiptError || !payingForSessionRef.current)
			return;
		const payload = readyPayloadRef.current;
		payingForSessionRef.current = null;
		readyPayloadRef.current = null;
		setFlowSendHash(undefined);
		if (payload) setState({ ...payload, status: "ready" });
		resetWriteContract?.();
	}, [isReceiptError, receiptError, resetWriteContract]);

	// Auto-verify only after tx is mined (receipt exists) so our server finds the receipt
	useEffect(() => {
		if (
			!isReceiptSuccess ||
			!receipt ||
			!pendingEvmHash ||
			!payingForSessionRef.current
		)
			return;
		const sessionToken = payingForSessionRef.current;
		const payload = readyPayloadRef.current;
		payingForSessionRef.current = null;
		readyPayloadRef.current = null;
		if (!payload) return;
		queueMicrotask(() => setState({ ...payload, status: "verifying" }));
		const chainId = flowSendHash
			? FLOW_EVM_TESTNET_CHAIN_ID
			: (payload.chainId ?? BASE_SEPOLIA_CHAIN_ID);
		fetch("/api/install/verify", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				sessionToken,
				transactionHash: pendingEvmHash,
				chainId,
			}),
		})
			.then((res) => res.json())
			.then((result) => {
				if (result.verified) {
					setFlowSendHash(undefined);
					setState({
						status: "verified",
						transactionHash: pendingEvmHash,
						chainId,
					});
				} else
					setState({
						status: "verify_error",
						error: result.error ?? "Verification failed",
					});
			})
			.catch(() =>
				setState({
					status: "verify_error",
					error: "Verification failed",
				}),
			);
	}, [isReceiptSuccess, receipt, pendingEvmHash, flowSendHash]);

	const handlePayWithWallet = useCallback(async () => {
		if (state.status !== "ready") return;
		const { sessionToken } = state;

		if (!isConnected) {
			open({ view: "Connect" });
			return;
		}

		// Flow EVM Testnet: native FLOW transfer (not USDC)
		if (state.flowPaymentOption) {
			const { flowAddress, amountFlowWei, chainId: flowChainId } = state.flowPaymentOption;
			if (chain?.id !== flowChainId) {
				try {
					await switchChainAsync({ chainId: flowChainId });
				} catch {
					return;
				}
			}
			payingForSessionRef.current = sessionToken;
			readyPayloadRef.current = state;
			setFlowSendHash(undefined);
			try {
				const hash = await sendTransactionAsync({
					to: flowAddress as `0x${string}`,
					value: BigInt(amountFlowWei),
				});
				if (hash) setFlowSendHash(hash);
			} catch {
				payingForSessionRef.current = null;
				readyPayloadRef.current = null;
			}
			return;
		}

		const { address: recipient, tokenAddress, amountUnits } = state;
		if (!tokenAddress || !amountUnits) return;

		const targetChainId = state.chainId ?? BASE_SEPOLIA_CHAIN_ID;
		if (chain?.id !== targetChainId) {
			try {
				await switchChainAsync({ chainId: targetChainId });
			} catch {
				return;
			}
		}

		payingForSessionRef.current = sessionToken;
		readyPayloadRef.current = state;
		resetWriteContract?.(); // clear previous payment-failed state when retrying
		writeContract({
			address: tokenAddress as `0x${string}`,
			abi: ERC20_TRANSFER_ABI,
			functionName: "transfer",
			args: [recipient as `0x${string}`, BigInt(amountUnits)],
			gas: GAS_ERC20_TRANSFER,
		});
	}, [
		state,
		isConnected,
		chain?.id,
		switchChainAsync,
		open,
		writeContract,
		resetWriteContract,
		sendTransactionAsync,
	]);

	const fetchSession = useCallback(
		async (token: string) => {
			setState({ status: "loading" });
			setGithubUsername("");
			setGithubSaved(false);
			setGithubError(null);
			setStarknetVerifyHash("");
			setStarknetVerifyError(null);
			setStarknetVerifying(false);
			setStarknetAccount(null);
			setStarknetPayError(null);
			try {
				const res = await fetch(
					`/api/install/session?session=${encodeURIComponent(token)}`,
				);
				if (!res.ok) {
					const data = await res.json().catch(() => ({}));
					setState({
						status: "invalid",
						error: data.error ?? "Invalid or expired session",
					});
					return;
				}
				const data = await res.json();
				// Pre-fill GitHub from session or from URL (?github=)
				const fromUrl = searchParams.get("github")?.trim() ?? "";
				const fromSession = data.githubUsername?.trim() ?? "";
				const initial = fromSession || fromUrl;
				setGithubUsername(initial);
				setGithubSaved(!!fromSession);
				payingForSessionRef.current = null;
				setState({
					status: "ready",
					price: data.price,
					address: data.address,
					projectName: data.projectName,
					sessionToken: data.sessionToken,
					paymentUri: data.paymentUri,
					chainId: data.chainId,
					currency: data.currency,
					tokenAddress: data.tokenAddress,
					amountUnits: data.amountUnits,
					pricingModel: data.pricingModel,
					githubUsername: data.githubUsername,
					githubUserId: data.githubUserId,
					receiveMode: data.receiveMode,
					paymentOptions: data.paymentOptions,
					suiPaymentOption: data.suiPaymentOption,
					starknetPaymentOption: data.starknetPaymentOption,
					flowPaymentOption: data.flowPaymentOption,
				});
			} catch {
				setState({
					status: "invalid",
					error: "Failed to load session",
				});
			}
		},
		[searchParams],
	);

	useEffect(() => {
		if (sessionParam?.trim()) {
			queueMicrotask(() => fetchSession(sessionParam.trim()));
		} else {
			queueMicrotask(() =>
				setState({
					status: "invalid",
					error: "Missing session. Use the payment link from the install flow.",
				}),
			);
		}
	}, [sessionParam, fetchSession]);

	const saveGithubUsername = useCallback(async () => {
		if (state.status !== "ready") return;
		const username = githubUsername.trim();
		if (!username || !/^[a-zA-Z0-9-]+$/.test(username)) {
			setGithubError(
				"Enter a valid GitHub username (letters, numbers, hyphens only)",
			);
			return;
		}
		setGithubError(null);
		setGithubSaving(true);
		try {
			const res = await fetch("/api/install/session", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sessionToken: state.sessionToken,
					githubUsername: username,
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (res.ok) {
				setGithubSaved(true);
				setState({ ...state, githubUsername: username });
			} else {
				setGithubError(data.error ?? "Failed to save GitHub username");
			}
		} catch {
			setGithubError("Failed to save GitHub username");
		} finally {
			setGithubSaving(false);
		}
	}, [state, githubUsername]);

	const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (state.status !== "ready") return;
		const form = e.currentTarget;
		const txHash = (
			form.elements.namedItem("transactionHash") as HTMLInputElement
		)?.value?.trim();
		if (!txHash) return;
		setState({ ...state, status: "verifying" });
		const chainId = state.chainId ?? BASE_SEPOLIA_CHAIN_ID;
		try {
			const res = await fetch("/api/install/verify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sessionToken: state.sessionToken,
					transactionHash: txHash,
					chainId,
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (res.ok && data.verified) {
				setState({
					status: "verified",
					transactionHash: txHash,
					chainId,
				});
			} else {
				setState({
					status: "verify_error",
					error: data.error ?? "Verification failed",
				});
			}
		} catch {
			setState({ status: "verify_error", error: "Verification failed" });
		}
	};

	const verifySuiWithDigest = useCallback(
		async (digest: string) => {
			if (state.status !== "ready" || !state.suiPaymentOption) return;
			setSuiVerifyError(null);
			setSuiVerifying(true);
			try {
				const res = await fetch("/api/install/verify", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						sessionToken: state.sessionToken,
						transactionDigest: digest,
						paymentType: "sui",
					}),
				});
				const data = await res.json().catch(() => ({}));
				if (res.ok && data.verified) {
					setState({
						status: "verified",
						transactionDigest: digest,
						suiNetwork: state.suiPaymentOption?.network ?? "testnet",
					});
				} else {
					setSuiVerifyError(data.error ?? "Verification failed");
				}
			} catch {
				setSuiVerifyError("Verification failed");
			} finally {
				setSuiVerifying(false);
			}
		},
		[state],
	);

	const handleVerifySui = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (state.status !== "ready" || !state.suiPaymentOption) return;
		const digest = (
			e.currentTarget.elements.namedItem(
				"suiTransactionDigest",
			) as HTMLInputElement
		)?.value?.trim();
		if (!digest) return;
		await verifySuiWithDigest(digest);
	};

	const verifyStarknetWithHash = useCallback(
		async (hash: string) => {
			if (state.status !== "ready" || !state.starknetPaymentOption) return;
			setStarknetVerifyError(null);
			setStarknetVerifying(true);
			try {
				const res = await fetch("/api/install/verify", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						sessionToken: state.sessionToken,
						transactionHash: hash,
						paymentType: "starknet",
					}),
				});
				const data = await res.json().catch(() => ({}));
				if (res.ok && data.verified) {
					setState({
						status: "verified",
						transactionHash: hash,
					});
				} else {
					setStarknetVerifyError(data.error ?? "Verification failed");
				}
			} catch {
				setStarknetVerifyError("Verification failed");
			} finally {
				setStarknetVerifying(false);
			}
		},
		[state],
	);

	const handleVerifyStarknet = async (
		e: React.FormEvent<HTMLFormElement>,
	) => {
		e.preventDefault();
		if (state.status !== "ready" || !state.starknetPaymentOption) return;
		const hash = (
			e.currentTarget.elements.namedItem(
				"starknetTransactionHash",
			) as HTMLInputElement
		)?.value?.trim();
		if (!hash) return;
		await verifyStarknetWithHash(hash);
	};

	const handlePayWithStarknet = useCallback(async () => {
		if (state.status !== "ready" || !state.starknetPaymentOption) return;
		const opt = state.starknetPaymentOption;
		const usdcAddress = opt.starknetUsdcAddress;
		if (!usdcAddress) {
			setStarknetPayError("USDC contract not configured for Starknet. Use manual transfer and verify below.");
			return;
		}
		setStarknetPayError(null);
		if (!starknetAccount) {
			setStarknetPayPending(true);
			try {
				const { wallet } = await connectStarknet({
					modalMode: "alwaysAsk",
					modalTheme: "system",
				});
				if (wallet) {
					const provider = new RpcProvider({
						nodeUrl: getStarknetRpcUrl(),
					});
					const account = await WalletAccount.connect(
						provider,
						wallet as Parameters<typeof WalletAccount.connect>[1],
					);
					setStarknetAccount({
						execute: account.execute.bind(account) as (
							calls: unknown[],
						) => Promise<{ transaction_hash: string }>,
					});
				}
			} catch (err) {
				setStarknetPayError(err instanceof Error ? err.message : "Failed to connect Starknet wallet");
			} finally {
				setStarknetPayPending(false);
			}
			return;
		}
		const amountUnits = BigInt(
			Math.round(parseFloat(opt.amountUsdc) * 10 ** PAYMENT_TOKEN_DECIMALS),
		);
		const amountU256 = cairo.uint256(amountUnits);
		const recipient = opt.starknetAddress.startsWith("0x")
			? opt.starknetAddress
			: `0x${opt.starknetAddress}`;
		const call = {
			contractAddress: usdcAddress,
			entrypoint: "transfer",
			calldata: [
				recipient,
				amountU256.low.toString(),
				amountU256.high.toString(),
			],
		};
		setStarknetPayPending(true);
		setStarknetPayError(null);
		try {
			const result = await starknetAccount.execute([call]);
			const txHash =
				(result as { transaction_hash?: string }).transaction_hash ??
				(result as { transactionHash?: string }).transactionHash;
			if (txHash) {
				setStarknetVerifyHash(txHash);
				await verifyStarknetWithHash(txHash);
			} else {
				setStarknetPayError("Transaction submitted but no hash returned");
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			const isRejected = /reject|denied|cancel/i.test(msg);
			setStarknetPayError(isRejected ? "Transaction cancelled" : msg || "Transaction failed");
		} finally {
			setStarknetPayPending(false);
		}
	}, [state, starknetAccount, verifyStarknetWithHash]);

	if (state.status === "loading") {
		return (
			<main className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-6 py-12">
				<div className="flex flex-col items-center gap-4">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					<p className="text-sm font-medium text-muted-foreground">
						Loading payment session…
					</p>
				</div>
			</main>
		);
	}

	if (state.status === "invalid") {
		return (
			<main className="mx-auto max-w-xl px-6 py-12">
				<div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
					<h1 className="text-xl font-semibold tracking-tight">
						Payment link invalid
					</h1>
					<p className="mt-2 text-muted-foreground">
						Use the payment link from the install flow (CLI or
						docs).
					</p>
					<div className="mt-6 rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
						{state.error}
					</div>
				</div>
			</main>
		);
	}

	if (state.status === "verified") {
		const evmTxUrl =
			state.transactionHash && state.chainId
				? getBlockExplorerTxUrl(state.chainId, state.transactionHash)
				: null;
		const suiTxUrl =
			state.transactionDigest && state.suiNetwork === "testnet"
				? getSuiTestnetTxUrl(state.transactionDigest)
				: null;
		const starknetTxUrl =
			state.transactionHash && !state.chainId && !state.transactionDigest
				? getStarknetSepoliaTxUrl(state.transactionHash)
				: null;
		const txUrl = evmTxUrl ?? suiTxUrl ?? starknetTxUrl;

		return (
			<main className="mx-auto max-w-xl px-6 py-12">
				<div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
							<svg
								className="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
						<div>
							<h1 className="text-xl font-semibold tracking-tight">
								Payment verified
							</h1>
							<p className="mt-0.5 text-sm text-muted-foreground">
								You can re-run the install command now.
							</p>
							{txUrl && (
								<a
									href={txUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
								>
									View testnet transaction
									<svg
										className="h-3.5 w-3.5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={2}
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
										/>
									</svg>
								</a>
							)}
						</div>
					</div>
				</div>
			</main>
		);
	}

	if (state.status === "verify_error") {
		return (
			<main className="mx-auto max-w-xl px-6 py-12">
				<div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
					<h1 className="text-xl font-semibold tracking-tight">
						Verification failed
					</h1>
					<div className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
						{state.error}
					</div>
					<p className="mt-4 text-sm text-muted-foreground">
						Check the transaction hash and try again, or open the
						payment link again for a fresh session.
					</p>
					{sessionParam?.trim() && (
						<button
							type="button"
							onClick={() => fetchSession(sessionParam.trim())}
							className="mt-6 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted"
						>
							Try again
						</button>
					)}
				</div>
			</main>
		);
	}

	// state.status === "ready" | "confirming" | "verifying" (all have ReadyPayload)
	if (
		state.status !== "ready" &&
		state.status !== "confirming" &&
		state.status !== "verifying"
	)
		return null;
	const { price, address: recipientAddress, projectName } = state;
	const isSubscription = state.pricingModel === "subscription";
	const isPerUser = state.pricingModel === "per_user";
	const isGithubBasedPricing = isSubscription || isPerUser;
	const hasGithub = !!state.githubUsername || githubSaved;
	const subscriptionNeedsGithub = isGithubBasedPricing && !hasGithub;

	const isSuiOnly = state.receiveMode === "sui";
	const isStarknetOnly = state.receiveMode === "starknet";
	const isFlowOnly = state.receiveMode === "flow";
	const networkLabel = isSuiOnly
		? state.suiPaymentOption?.network === "testnet"
			? "Sui Testnet"
			: "Sui"
		: isStarknetOnly
			? "Starknet Sepolia"
			: isFlowOnly
				? "Flow EVM Testnet"
				: "Base Sepolia";
	const amountCopyText =
		isSuiOnly && state.suiPaymentOption
			? `${state.suiPaymentOption.amountSui} ${state.suiPaymentOption.currency}`
			: isFlowOnly && state.flowPaymentOption
				? `${state.flowPaymentOption.amountFlow} ${state.flowPaymentOption.currency}`
				: `${price} ${state.currency ?? "USDC"}`;

	const payThemeClass = isStarknetOnly
		? "starknet-pay"
		: isSuiOnly
			? "sui-pay"
			: isFlowOnly
				? "flow-pay"
				: "base-pay";

	return (
		<main className={`${payThemeClass} min-h-screen bg-background`}>
			<div className="mx-auto max-w-xl	">
				{/* Header */}
				<header className="mb-6">
					<h1 className="text-2xl font-semibold tracking-tight text-foreground">
						Complete payment
					</h1>
					{projectName && (
						<p className="mt-1 text-muted-foreground">
							Pay for{" "}
							<span className="font-medium text-foreground">
								{projectName}
							</span>
						</p>
					)}
					{isSubscription && (
						<p className="mt-2 text-sm text-muted-foreground">
							Subscription is tied to your GitHub identity. After
							payment you can install from any machine with the
							same GitHub user.
						</p>
					)}
					{isPerUser && (
						<p className="mt-2 text-sm text-muted-foreground">
							Per-user access is tied to your GitHub identity. One
							payment per user; install from any machine with the
							same GitHub user.
						</p>
					)}
				</header>

				{/* Step indicator: 1 Review → 2 Pay → 3 Verify (EVM); Sui uses its own verify UX */}
				<div
					className="mb-6 flex items-center justify-center gap-3 rounded-xl bg-card px-4 py-3 shadow-sm ring-1 ring-border/60"
					aria-label="Payment steps"
				>
					<span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
						<span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
							1
						</span>
						Review
					</span>
					<span className="h-px w-6 bg-border" aria-hidden />
					<span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
						<span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">
							2
						</span>
						Pay
					</span>
					<span className="h-px w-6 bg-border" aria-hidden />
					<span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
						<span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">
							3
						</span>
						Verify
					</span>
				</div>

				<div className="space-y-5">
					{/* GitHub (subscription / per_user) — Step 0 */}
					{subscriptionNeedsGithub && (
						<section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm">
							<div className="flex items-center gap-2">
								<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
									*
								</span>
								<label
									htmlFor="githubUsername"
									className="text-sm font-medium"
								>
									GitHub username (required for{" "}
									{isPerUser ? "per-user" : "subscription"})
								</label>
							</div>
							<div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
								<input
									id="githubUsername"
									type="text"
									value={githubUsername}
									onChange={(e) => {
										setGithubUsername(e.target.value);
										setGithubError(null);
									}}
									placeholder="your-github-username"
									className="min-w-0 flex-1 rounded-md border border-input bg-background px-3.5 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
									disabled={githubSaving || githubSaved}
								/>
								<Button
									type="button"
									onClick={saveGithubUsername}
									disabled={
										githubSaving ||
										githubSaved ||
										!githubUsername.trim()
									}
									className="shrink-0 rounded-md"
								>
									{githubSaved
										? "Saved"
										: githubSaving
											? "Saving…"
											: "Save"}
								</Button>
							</div>
							{githubError && (
								<p className="mt-2 text-sm text-destructive">
									{githubError}
								</p>
							)}
							{!githubSaved && (
								<p className="mt-1.5 text-xs text-muted-foreground">
									Save your GitHub username before paying so
									we can link this purchase to your GitHub
									account.
								</p>
							)}
						</section>
					)}
					{isGithubBasedPricing && hasGithub && (
						<p className="text-sm text-muted-foreground">
							{isSubscription ? "Subscribing" : "Paying"} as:{" "}
							<span className="font-mono font-medium text-foreground">
								{state.githubUsername || githubUsername}
							</span>
						</p>
					)}

					{/* Payment failed or cancelled (ready + write error) */}
					{state.status === "ready" && isWriteError && (
						<div
							className={`flex items-start gap-3 rounded-2xl border px-5 py-4 ${
								isUserRejectedRequestError(writeError)
									? "border-muted-foreground/30 bg-muted/50"
									: "border-destructive/30 bg-destructive/5"
							}`}
							role="alert"
						>
							<AlertCircle
								className={`mt-0.5 h-5 w-5 shrink-0 ${
									isUserRejectedRequestError(writeError)
										? "text-muted-foreground"
										: "text-destructive"
								}`}
							/>
							<div>
								<p
									className={
										isUserRejectedRequestError(writeError)
											? "font-medium text-muted-foreground"
											: "font-medium text-destructive"
									}
								>
									{isUserRejectedRequestError(writeError)
										? "Transaction cancelled"
										: "Payment failed"}
								</p>
								<div
									className={`mt-1 max-w-full overflow-hidden wrap-break-word text-sm ${
										isUserRejectedRequestError(writeError)
											? "text-muted-foreground"
											: "text-destructive/90"
									}`}
								>
									<p>
										{(() => {
											if (
												isUserRejectedRequestError(
													writeError,
												)
											) {
												return "You can try again when ready.";
											}
											return shortContractError(
												writeError?.message ??
													"Transaction was rejected or failed. Check your balance and try again.",
											);
										})()}
									</p>
									{!isUserRejectedRequestError(
										writeError,
									) && (
										<p className="mt-1 text-xs text-muted-foreground">
											If it failed the first time, try again.
											It often succeeds on retry.
										</p>
									)}
								</div>
							</div>
						</div>
					)}

					{/* Step 1: Payment summary card */}
					<section
						className="rounded-2xl border border-border bg-card p-4 shadow-sm"
						aria-label="Payment details"
					>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div>
								<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
									Amount
								</p>
								<p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
									{amountCopyText}
								</p>
								<CopyButton
									value={amountCopyText}
									buttonText="Copy amount"
									variant="ghost"
									size="xs"
									className="mt-1.5 -ml-1 rounded-lg"
								/>
							</div>
							<span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
								{networkLabel}
							</span>
						</div>
						<div className="mt-4 border-t border-border pt-4">
							<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
								Recipient address
							</p>
							<div className="mt-1.5 flex flex-wrap items-center gap-2">
								<code className="max-w-full break-all rounded-lg bg-muted/60 px-2 py-1.5 font-mono text-sm">
									{recipientAddress}
								</code>
								<CopyButton
									value={recipientAddress}
									label="Copy recipient address"
									buttonText="Copy"
									variant="outline"
									size="xs"
									className="rounded-lg"
								/>
							</div>
						</div>
					</section>

					{/* Pay with SUI (same structure as FLOW card) */}
					{state.suiPaymentOption && (
						<section
							className="rounded-2xl border border-border bg-card p-4 shadow-sm"
							aria-label="Pay with SUI"
						>
							<div className="flex items-center gap-2">
								<Wallet className="h-5 w-5 text-primary" />
								<h2 className="text-base font-semibold text-foreground">
									Pay with SUI
									{state.suiPaymentOption.network ===
										"testnet" && (
										<span className="ml-1.5 text-xs font-normal text-muted-foreground">
											(Testnet)
										</span>
									)}
								</h2>
							</div>
							<p className="mt-1.5 text-sm text-muted-foreground">
								Send SUI on Sui{" "}
								{state.suiPaymentOption.network === "testnet"
									? "testnet"
									: "mainnet"}{" "}
								to the address below.
							</p>
							<div className="mt-4 space-y-3">
								<div>
									<p className="text-xs font-medium text-muted-foreground">
										Amount
									</p>
									<p className="mt-1 font-semibold tabular-nums text-foreground">
										{state.suiPaymentOption.amountSui}{" "}
										{state.suiPaymentOption.currency}
									</p>
								</div>
								<div>
									<p className="text-xs font-medium text-muted-foreground">
										Sui receive address
									</p>
									<div className="mt-1.5 flex flex-wrap items-center gap-2">
										<code className="max-w-full break-all rounded-lg bg-muted/60 px-2 py-1.5 font-mono text-sm">
											{state.suiPaymentOption.suiAddress}
										</code>
										<CopyButton
											value={
												state.suiPaymentOption
													.suiAddress
											}
											label="Copy Sui address"
											buttonText="Copy"
											variant="outline"
											size="xs"
											className="rounded-lg"
										/>
									</div>
								</div>
								{/* Open Sui Wallet extension to pay (connect if needed, then sign & execute) */}
								<div className="flex flex-col gap-2">
									<ConnectModal
										trigger={
											<span
												className="hidden"
												aria-hidden
											/>
										}
										open={suiConnectOpen}
										onOpenChange={setSuiConnectOpen}
									/>
									<Button
										type="button"
										disabled={
											suiVerifying || suiSignPending
										}
										onClick={async () => {
											const opt = state.suiPaymentOption!;
											setSuiPayError(null);
											if (
												suiWallet.connectionStatus ===
												"disconnected"
											) {
												setSuiConnectOpen(true);
												return;
											}
											const amountMist = BigInt(
												Math.ceil(
													parseFloat(opt.amountSui) *
														10 ** SUI_DECIMALS,
												),
											);
											const chain =
												opt.network === "testnet"
													? "sui:testnet"
													: "sui:mainnet";
											const tx = new Transaction();
											const [coin] = tx.splitCoins(
												tx.gas,
												[amountMist],
											);
											tx.transferObjects(
												[coin],
												opt.suiAddress,
											);
											try {
												const result =
													await signAndExecuteSui({
														transaction: tx,
														chain,
													});
												const digest =
													typeof result ===
														"object" &&
													result !== null &&
													"digest" in result &&
													typeof (
														result as {
															digest?: string;
														}
													).digest === "string"
														? (
																result as {
																	digest: string;
																}
															).digest
														: undefined;
												if (digest) {
													setSuiVerifyDigest(digest);
													await verifySuiWithDigest(
														digest,
													);
												}
											} catch (err) {
												setSuiPayError(
													err instanceof Error
														? err.message
														: "Transaction failed",
												);
											}
										}}
										className="w-full py-3 font-medium"
									>
										{suiWallet.connectionStatus ===
										"disconnected"
											? "Connect Sui Wallet"
											: suiSignPending
												? "Confirm in wallet…"
												: "Pay with Sui Wallet"}
									</Button>
									{suiPayError && (
										<p
											className="text-center text-sm text-destructive"
											role="alert"
										>
											{suiPayError}
										</p>
									)}
									<p className="text-xs text-muted-foreground">
										{suiWallet.connectionStatus ===
										"disconnected"
											? "Connect your Sui wallet extension to pay."
											: "Opens your Sui wallet extension to sign and send."}
									</p>
								</div>
								<div className="border-t border-border pt-4">
									<div className="flex items-center gap-2">
										<Hash className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-sm font-semibold text-foreground">
											Already sent? Verify with
											transaction digest
										</h3>
									</div>
									<form
										onSubmit={handleVerifySui}
										className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end"
									>
										<input
											id="suiTransactionDigest"
											name="suiTransactionDigest"
											type="text"
											value={suiVerifyDigest}
											onChange={(e) => {
												setSuiVerifyDigest(
													e.target.value,
												);
												setSuiVerifyError(null);
											}}
											placeholder="Paste transaction digest from Sui wallet/explorer"
											className="min-w-0 flex-1 rounded-md border border-input bg-background px-3.5 py-2.5 font-mono text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
											disabled={suiVerifying}
										/>
										<Button
											type="submit"
											disabled={
												suiVerifying ||
												!suiVerifyDigest.trim() ||
												subscriptionNeedsGithub
											}
											className="rounded-md py-2.5 font-medium sm:w-auto sm:min-w-[140px]"
										>
											{suiVerifying
												? "Verifying…"
												: "Verify SUI payment"}
										</Button>
									</form>
									{suiVerifyError && (
										<p
											className="mt-2 text-sm text-destructive"
											role="alert"
										>
											{suiVerifyError}
										</p>
									)}
								</div>
							</div>
						</section>
					)}

					{/* Pay with Starknet (same structure as FLOW card) */}
					{state.starknetPaymentOption && (
						<section
							className="rounded-2xl border border-border bg-card p-4 shadow-sm"
							aria-label="Pay with Starknet"
						>
							<div className="flex items-center gap-2">
								<Wallet className="h-5 w-5 text-primary" />
								<h2 className="text-base font-semibold text-foreground">
									Pay with Starknet
									<span className="ml-1.5 text-xs font-normal text-muted-foreground">
										(Sepolia)
									</span>
								</h2>
							</div>
							<p className="mt-1.5 text-sm text-muted-foreground">
								Send USDC on Starknet Sepolia to the address below.
							</p>
							<div className="mt-4 space-y-3">
								<div>
									<p className="text-xs font-medium text-muted-foreground">
										Amount
									</p>
									<p className="mt-1 font-semibold tabular-nums text-foreground">
										{state.starknetPaymentOption.amountUsdc}{" "}
										{state.starknetPaymentOption.currency}
									</p>
								</div>
								<div>
									<p className="text-xs font-medium text-muted-foreground">
										Starknet receive address
									</p>
									<div className="mt-1.5 flex flex-wrap items-center gap-2">
										<code className="max-w-full break-all rounded-lg bg-muted/60 px-2 py-1.5 font-mono text-sm">
											{state.starknetPaymentOption.starknetAddress}
										</code>
										<CopyButton
											value={
												state.starknetPaymentOption.starknetAddress
											}
											label="Copy Starknet address"
											buttonText="Copy"
											variant="outline"
											size="xs"
											className="rounded-lg"
										/>
									</div>
								</div>
								{/* Pay with Starknet Wallet (connect via StarknetKit, then execute USDC transfer) */}
								<div className="flex flex-col gap-2">
									<Button
										type="button"
										disabled={
											starknetVerifying ||
											starknetPayPending ||
											subscriptionNeedsGithub
										}
										onClick={handlePayWithStarknet}
										className="w-full py-3 font-medium"
									>
										{!starknetAccount
											? "Connect Starknet Wallet"
											: starknetPayPending
												? "Confirm in wallet…"
												: "Pay with Starknet Wallet"}
									</Button>
									{starknetPayError && (
										<p
											className="text-center text-sm text-destructive"
											role="alert"
										>
											{starknetPayError}
										</p>
									)}
									<p className="text-xs text-muted-foreground">
										{!starknetAccount
											? "Connect your Starknet wallet (Braavos, Argent, etc.) to pay."
											: "Opens your Starknet wallet to sign and send USDC."}
									</p>
								</div>
								<div className="border-t border-border pt-4">
									<div className="flex items-center gap-2">
										<Hash className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-sm font-semibold text-foreground">
											Already sent? Verify with
											transaction hash
										</h3>
									</div>
									<form
										onSubmit={handleVerifyStarknet}
										className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end"
									>
										<input
											id="starknetTransactionHash"
											name="starknetTransactionHash"
											type="text"
											value={starknetVerifyHash}
											onChange={(e) => {
												setStarknetVerifyHash(
													e.target.value,
												);
												setStarknetVerifyError(null);
											}}
											placeholder="Paste 0x… transaction hash from Starknet wallet/explorer"
											className="min-w-0 flex-1 rounded-md border border-input bg-background px-3.5 py-2.5 font-mono text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
											disabled={starknetVerifying}
										/>
										<Button
											type="submit"
											disabled={
												starknetVerifying ||
												!starknetVerifyHash.trim() ||
												subscriptionNeedsGithub
											}
											className="rounded-md py-2.5 font-medium sm:w-auto sm:min-w-[140px]"
										>
											{starknetVerifying
												? "Verifying…"
												: "Verify USDC payment"}
										</Button>
									</form>
									{starknetVerifyError && (
										<p
											className="mt-2 text-sm text-destructive"
											role="alert"
										>
											{starknetVerifyError}
										</p>
									)}
								</div>
							</div>
						</section>
					)}

					{/* Step 2 (direct): Pay with wallet + Verify in one card (Base / Flow EVM; Sui/Starknet use blocks above) */}
					{(state.receiveMode === "base" || state.receiveMode === "flow") && (
							<section
								className="rounded-2xl border border-border bg-card p-4 shadow-sm"
								aria-label="Pay and verify"
							>
								{state.flowPaymentOption ? (
									<>
										<div className="flex items-center gap-2">
											<Wallet className="h-5 w-5 text-primary" />
											<h2 className="text-base font-semibold text-foreground">
												Pay with FLOW
											</h2>
										</div>
										<p className="mt-1.5 text-sm text-muted-foreground">
											Send native FLOW on Flow EVM Testnet to the address below.
										</p>
										<div className="mt-4 space-y-3">
											<div>
												<p className="text-xs font-medium text-muted-foreground">Amount</p>
												<p className="mt-1 font-semibold tabular-nums text-foreground">
													{state.flowPaymentOption.amountFlow} {state.flowPaymentOption.currency}
												</p>
											</div>
											<div>
												<p className="text-xs font-medium text-muted-foreground">Flow EVM address</p>
												<div className="mt-1.5 flex flex-wrap items-center gap-2">
													<code className="max-w-full break-all rounded-lg bg-muted/60 px-2 py-1.5 font-mono text-sm">
														{state.flowPaymentOption.flowAddress}
													</code>
													<CopyButton
														value={state.flowPaymentOption.flowAddress}
														label="Copy address"
														buttonText="Copy"
														variant="outline"
														size="xs"
														className="rounded-lg"
													/>
												</div>
											</div>
											<Button
												type="button"
												onClick={handlePayWithWallet}
												disabled={isSendPending || subscriptionNeedsGithub}
												className="w-full py-3 font-medium"
											>
												{!isConnected
													? "Connect wallet"
													: isSendPending
														? "Confirm in wallet…"
														: "Send FLOW"}
											</Button>
											<p className="text-xs text-muted-foreground">
												{!isConnected
													? `Connect to pay with FLOW on ${networkLabel}.`
													: "Opens your wallet to send native FLOW."}
											</p>
										</div>
									</>
								) : paymentUri ? (
									<>
										<div className="flex items-center gap-2">
											<Wallet className="h-5 w-5 text-primary" />
											<h2 className="text-base font-semibold text-foreground">
												Pay with USDC
											</h2>
										</div>
										<p className="mt-1.5 text-sm text-muted-foreground">
											Send USDC on {networkLabel} to the address below.
										</p>
										<div className="mt-4 space-y-3">
											<div>
												<p className="text-xs font-medium text-muted-foreground">Amount</p>
												<p className="mt-1 font-semibold tabular-nums text-foreground">
													{price} {state.currency ?? "USDC"}
												</p>
											</div>
											<div>
												<p className="text-xs font-medium text-muted-foreground">Recipient address</p>
												<div className="mt-1.5 flex flex-wrap items-center gap-2">
													<code className="max-w-full break-all rounded-lg bg-muted/60 px-2 py-1.5 font-mono text-sm">
														{recipientAddress}
													</code>
													<CopyButton
														value={recipientAddress}
														label="Copy address"
														buttonText="Copy"
														variant="outline"
														size="xs"
														className="rounded-lg"
													/>
												</div>
											</div>
											<Button
												type="button"
												onClick={handlePayWithWallet}
												disabled={isWritePending || subscriptionNeedsGithub}
												className="w-full py-3 font-medium"
											>
												{!isConnected
													? "Connect wallet"
													: isWritePending
														? "Confirm in wallet…"
														: "Send USDC"}
											</Button>
											<p className="text-xs text-muted-foreground">
												{!isConnected
													? `Connect to pay with USDC on ${networkLabel}.`
													: "Opens your wallet to send USDC."}
											</p>
										</div>
									</>
								) : (
									<p className="text-sm text-muted-foreground">
										Send the amount above to the address,
										then paste the transaction hash below to
										verify.
									</p>
								)}

								{/* Verify: same card, clear separation */}
								<div className="mt-4 border-t border-border pt-4">
									<div className="flex items-center gap-2">
										<Hash className="h-5 w-5 text-muted-foreground" />
										<h3 className="text-sm font-semibold text-foreground">
											Already sent? Verify with
											transaction hash
										</h3>
									</div>
									<form
										className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end"
										onSubmit={(e) => {
											if (subscriptionNeedsGithub) {
												e.preventDefault();
												return;
											}
											handleVerify(e);
										}}
									>
										<label
											htmlFor="transactionHash"
											className="sr-only"
										>
											Transaction hash
										</label>
										<input
											id="transactionHash"
											name="transactionHash"
											type="text"
											required
											placeholder="Paste 0x… transaction hash"
											className="min-w-0 flex-1 rounded-md border border-input bg-background px-3.5 py-2.5 font-mono text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
											disabled={
												state.status === "verifying"
											}
										/>
										<Button
											type="submit"
											disabled={
												state.status === "confirming" ||
												state.status === "verifying" ||
												subscriptionNeedsGithub
											}
											className="rounded-md py-2.5 font-medium sm:w-auto sm:min-w-[140px]"
										>
											{state.status === "confirming"
												? "Confirming…"
												: state.status === "verifying"
													? "Verifying…"
													: "Verify payment"}
										</Button>
									</form>
									{subscriptionNeedsGithub && (
										<p className="mt-1.5 text-xs text-muted-foreground">
											Save your GitHub username above
											before verifying.
										</p>
									)}
								</div>
							</section>
						)}

					{/* Status: confirming / verifying */}
					{(state.status === "confirming" ||
						state.status === "verifying") && (
						<div
							className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3"
							role="status"
							aria-live="polite"
						>
							<div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
							<p className="text-sm font-medium text-foreground">
								{state.status === "confirming"
									? "Waiting for transaction to be confirmed…"
									: "Verifying payment on chain…"}
							</p>
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
