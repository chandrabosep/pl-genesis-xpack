"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
	useAccount,
	useSwitchChain,
	useWaitForTransactionReceipt,
	useWriteContract,
	useSignTypedData,
} from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { AlertCircle, Wallet, Hash } from "lucide-react";
import { SUPPORTED_CHAINS } from "@/lib/x402/payment-config";
import { CopyButton } from "@/components/ui/copy-button";
import { Button } from "@/components/ui/button";

/** Circle Gateway Minter on Arc (and other EVM testnets). */
const GATEWAY_MINTER_ADDRESS =
	"0x0022222ABE238Cc2C7Bb1f21003F0a260052475B" as const;
const GATEWAY_MINTER_ABI = [
	{
		type: "function" as const,
		name: "gatewayMint",
		stateMutability: "nonpayable" as const,
		inputs: [
			{ name: "attestationPayload", type: "bytes" },
			{ name: "signature", type: "bytes" },
		],
		outputs: [],
	},
] as const;

/** Gateway Wallet: deposit your USDC here to get a Gateway balance. Same address on Base Sepolia and Arc. */
const GATEWAY_WALLET_ADDRESS =
	"0x0077777d7EBA4688BDeF3E311b846F25870A19B9" as const;
const GATEWAY_DEPOSIT_ABI = [
	{
		type: "function" as const,
		name: "deposit",
		stateMutability: "nonpayable" as const,
		inputs: [
			{ name: "token", type: "address" },
			{ name: "value", type: "uint256" },
		],
		outputs: [],
	},
] as const;

const ERC20_APPROVE_ABI = [
	{
		type: "function" as const,
		name: "approve",
		stateMutability: "nonpayable" as const,
		inputs: [
			{ name: "spender", type: "address" },
			{ name: "amount", type: "uint256" },
		],
		outputs: [{ type: "bool" }],
	},
] as const;

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
const GAS_ERC20_APPROVE = BigInt(50_000);
const GAS_ERC20_TRANSFER = BigInt(65_000);
const GAS_GATEWAY_DEPOSIT = BigInt(100_000);
const GAS_GATEWAY_MINT = BigInt(300_000);

const BASE_SEPOLIA_CHAIN_ID = 84532;
const ARC_TESTNET_CHAIN_ID = 5042002;

const USDC_BY_CHAIN: Record<number, string> = Object.fromEntries(
	SUPPORTED_CHAINS.map((c) => [c.chainId, c.usdcAddress]),
);
const GATEWAY_DEPOSIT_AMOUNT_USDC = 2;
const GATEWAY_DEPOSIT_AMOUNT_UNITS = BigInt(
	GATEWAY_DEPOSIT_AMOUNT_USDC * 1_000_000,
);

/** True when the wallet user rejected/cancelled the transaction (e.g. MetaMask "Reject"). */
function isUserRejectedRequestError(err: unknown): boolean {
	if (!err || typeof err !== "object") return false;
	const msg =
		"message" in err && typeof (err as { message?: string }).message === "string"
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
	receiveMode?: "base" | "any_chain";
	paymentOptions?: PaymentOption[];
};

type SessionState =
	| { status: "loading" }
	| { status: "invalid"; error: string }
	| ({ status: "ready" } & ReadyPayload)
	| ({ status: "confirming" } & ReadyPayload) // tx submitted, waiting for block
	| ({ status: "verifying" } & ReadyPayload) // tx mined, checking on our server
	| { status: "verified" }
	| { status: "verify_error"; error: string };

export default function PayPage() {
	const searchParams = useSearchParams();
	const sessionParam = searchParams.get("session");
	const [state, setState] = useState<SessionState>({ status: "loading" });
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const payingForSessionRef = useRef<string | null>(null);
	const readyPayloadRef = useRef<ReadyPayload | null>(null);
	// For subscription: GitHub username when missing from session (user enters on pay page)
	const [githubUsername, setGithubUsername] = useState("");
	const [githubSaved, setGithubSaved] = useState(false);
	const [githubSaving, setGithubSaving] = useState(false);
	const [githubError, setGithubError] = useState<string | null>(null);
	// Circle Gateway flow: source chain for Gateway balance, then attestation + mint
	const [gatewaySourceChainId, setGatewaySourceChainId] = useState(
		BASE_SEPOLIA_CHAIN_ID,
	);

	// When user selects a chain in "Pay with USDC on", use it as gateway source so Pay with Gateway works for that chain
	useEffect(() => {
		if (
			state.status !== "ready" &&
			state.status !== "confirming" &&
			state.status !== "verifying"
		)
			return;
		const chainId = "chainId" in state ? state.chainId : undefined;
		const options =
			"paymentOptions" in state ? state.paymentOptions : undefined;
		if (
			options?.length &&
			chainId != null &&
			SUPPORTED_CHAINS.some((c) => c.chainId === chainId)
		) {
			setGatewaySourceChainId(chainId);
		}
	}, [state]);
	const [gatewayError, setGatewayError] = useState<string | null>(null);
	const [gatewayStep, setGatewayStep] = useState<
		"idle" | "loading" | "sign" | "request" | "mint"
	>("idle");
	const [gatewayDepositDone, setGatewayDepositDone] = useState(false);
	const [gatewayBalance, setGatewayBalance] = useState<string | null>(null);
	const [gatewayBalanceLoading, setGatewayBalanceLoading] = useState(false);
	const gatewayDepositRef = useRef<{
		phase: "approve" | "deposit";
		usdcAddress: string;
		amountUnits: bigint;
	} | null>(null);

	const { address: walletAddress, isConnected, chain } = useAccount();
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
	const { signTypedDataAsync } = useSignTypedData();

	// Wait for tx to be mined before we call verify (avoids "Transaction not found")
	const { data: receipt, isSuccess: isReceiptSuccess } =
		useWaitForTransactionReceipt({ hash: txHash ?? undefined });

	const paymentUri =
		state.status === "ready" ||
		state.status === "confirming" ||
		state.status === "verifying"
			? state.paymentUri
			: undefined;
	useEffect(() => {
		if (!paymentUri) {
			queueMicrotask(() => setQrDataUrl(null));
			return;
		}
		let cancelled = false;
		QRCode.toDataURL(paymentUri, { width: 256, margin: 2 })
			.then((url) => {
				if (!cancelled) setQrDataUrl(url);
			})
			.catch(() => {
				if (!cancelled) setQrDataUrl(null);
			});
		return () => {
			cancelled = true;
		};
	}, [paymentUri]);

	// When tx is submitted, show "Confirming…" (waiting for block)
	useEffect(() => {
		if (!txHash || !payingForSessionRef.current) return;
		const payload = readyPayloadRef.current;
		if (!payload) return;
		setGatewayStep("idle");
		// Only set confirming if we're still in ready (avoid overwriting verifying/verified)
		setState((s) =>
			s.status === "ready" ? { ...payload, status: "confirming" } : s,
		);
	}, [txHash]);

	// When any write fails (rejected or reverted), clear gateway deposit flow so "Deposit" / "Confirm approve" is unblocked and retryable
	useEffect(() => {
		if (!isWriteError || !writeError) return;
		gatewayDepositRef.current = null;
		setGatewayError(null);
		setGatewayStep("idle");
	}, [isWriteError, writeError]);

	// Gateway deposit flow: after approve confirms, run deposit; after deposit confirms, mark done
	useEffect(() => {
		if (!isReceiptSuccess || !txHash || !gatewayDepositRef.current) return;
		const next = gatewayDepositRef.current;
		if (next.phase === "approve") {
			gatewayDepositRef.current = { ...next, phase: "deposit" };
			writeContract({
				address: GATEWAY_WALLET_ADDRESS,
				abi: GATEWAY_DEPOSIT_ABI,
				functionName: "deposit",
				args: [next.usdcAddress as `0x${string}`, next.amountUnits],
				gas: GAS_GATEWAY_DEPOSIT,
			});
		} else {
			gatewayDepositRef.current = null;
			setGatewayDepositDone(true);
			setGatewayError(null);
		}
	}, [isReceiptSuccess, txHash, writeContract]);

	// Auto-verify only after tx is mined (receipt exists) so our server finds the receipt
	useEffect(() => {
		if (
			!isReceiptSuccess ||
			!receipt ||
			!txHash ||
			!payingForSessionRef.current
		)
			return;
		if (gatewayDepositRef.current) return; // let the deposit effect handle it
		const sessionToken = payingForSessionRef.current;
		const payload = readyPayloadRef.current;
		payingForSessionRef.current = null;
		readyPayloadRef.current = null;
		if (!payload) return;
		queueMicrotask(() => setState({ ...payload, status: "verifying" }));
		const chainId = payload.chainId ?? BASE_SEPOLIA_CHAIN_ID;
		fetch("/api/install/verify", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				sessionToken,
				transactionHash: txHash,
				chainId,
			}),
		})
			.then((res) => res.json())
			.then((result) => {
				if (result.verified) setState({ status: "verified" });
				else
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
	}, [isReceiptSuccess, receipt, txHash]);

	const handlePayWithWallet = useCallback(async () => {
		if (state.status !== "ready") return;
		const {
			address: recipient,
			sessionToken,
			tokenAddress,
			amountUnits,
		} = state;
		if (!tokenAddress || !amountUnits) return;

		if (!isConnected) {
			open({ view: "Connect" });
			return;
		}

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
	]);

	const handlePayWithGateway = useCallback(async () => {
		if (state.status !== "ready" || !walletAddress) return;
		setGatewayError(null);
		setGatewayStep("loading");
		try {
			// Switch to the selected gateway source chain so the wallet shows the correct network when signing
			if (chain?.id !== gatewaySourceChainId) {
				await switchChainAsync({ chainId: gatewaySourceChainId });
			}
			const res = await fetch(
				`/api/circle/gateway/attestation?session=${encodeURIComponent(state.sessionToken)}&depositor=${encodeURIComponent(walletAddress)}&sourceChainId=${gatewaySourceChainId}`,
			);
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error ?? "Failed to get burn intent");
			}
			const data = await res.json();
			const msg = data.message;
			// Rebuild typed data with bigint for signTypedData
			const message = {
				...msg,
				maxBlockHeight: BigInt(msg.maxBlockHeight),
				maxFee: BigInt(msg.maxFee),
				spec: {
					...msg.spec,
					value: BigInt(msg.spec.value),
				},
			};
			const typedData = { ...data.typedData, message };
			setGatewayStep("sign");
			const signature = await signTypedDataAsync(typedData);
			setGatewayStep("request");
			const postRes = await fetch("/api/circle/gateway/attestation", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sessionToken: state.sessionToken,
					burnIntent: data.message,
					signature,
				}),
			});
			if (!postRes.ok) {
				const errData = await postRes.json().catch(() => ({}));
				throw new Error(errData.error ?? "Attestation failed");
			}
			const { attestation, signature: sig } = await postRes.json();
			const attestationHex = attestation.startsWith("0x")
				? attestation
				: `0x${attestation}`;
			const sigHex = sig.startsWith("0x") ? sig : `0x${sig}`;
			if (chain?.id !== ARC_TESTNET_CHAIN_ID) {
				await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID });
			}
			payingForSessionRef.current = state.sessionToken;
			readyPayloadRef.current = {
				...state,
				chainId: ARC_TESTNET_CHAIN_ID,
			};
			setGatewayStep("mint");
			resetWriteContract?.();
			writeContract({
				address: GATEWAY_MINTER_ADDRESS,
				abi: GATEWAY_MINTER_ABI,
				functionName: "gatewayMint",
				args: [
					attestationHex as `0x${string}`,
					sigHex as `0x${string}`,
				],
				gas: GAS_GATEWAY_MINT,
			});
		} catch (err) {
			setGatewayError(
				err instanceof Error ? err.message : "Gateway payment failed",
			);
			setGatewayStep("idle");
		}
	}, [
		state,
		walletAddress,
		gatewaySourceChainId,
		chain?.id,
		switchChainAsync,
		signTypedDataAsync,
		writeContract,
		resetWriteContract,
	]);

	const handleDepositToGateway = useCallback(async () => {
		if (!isConnected || !walletAddress) return;
		const usdcAddress = USDC_BY_CHAIN[gatewaySourceChainId];
		if (!usdcAddress) return;
		setGatewayError(null);
		setGatewayDepositDone(false);
		try {
			if (chain?.id !== gatewaySourceChainId) {
				await switchChainAsync({ chainId: gatewaySourceChainId });
			}
			gatewayDepositRef.current = {
				phase: "approve",
				usdcAddress,
				amountUnits: GATEWAY_DEPOSIT_AMOUNT_UNITS,
			};
			resetWriteContract?.();
			writeContract({
				address: usdcAddress as `0x${string}`,
				abi: ERC20_APPROVE_ABI,
				functionName: "approve",
				args: [GATEWAY_WALLET_ADDRESS, GATEWAY_DEPOSIT_AMOUNT_UNITS],
				gas: GAS_ERC20_APPROVE,
			});
		} catch (err) {
			gatewayDepositRef.current = null;
			setGatewayError(
				err instanceof Error ? err.message : "Deposit failed",
			);
		}
	}, [
		isConnected,
		walletAddress,
		chain?.id,
		gatewaySourceChainId,
		switchChainAsync,
		writeContract,
		resetWriteContract,
	]);

	const fetchSession = useCallback(
		async (token: string) => {
			setState({ status: "loading" });
			setGithubUsername("");
			setGithubSaved(false);
			setGithubError(null);
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
				setState({ status: "verified" });
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
					<div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
						{state.error}
					</div>
				</div>
			</main>
		);
	}

	if (state.status === "verified") {
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
					<div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
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
							className="mt-6 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted"
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
	const hasGithub = !!state.githubUsername || githubSaved;
	const subscriptionNeedsGithub = isSubscription && !hasGithub;

	const networkLabel =
		state.receiveMode === "any_chain"
			? "Arc (via Gateway)"
			: state.chainId === ARC_TESTNET_CHAIN_ID
				? "Arc"
				: "Base Sepolia";
	const amountCopyText = `${price} ${state.currency ?? "USDC"}`;

	return (
		<main className="min-h-screen bg-muted/30">
			<div className="mx-auto max-w-xl px-4 py-4 sm:px-6 sm:py-6">
				{/* Header */}
				<header className="mb-4">
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
				</header>

				{/* Step indicator: 1 Review → 2 Pay → 3 Verify (direct) or 1 Review → 2 Pay (Gateway) */}
				<div
					className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-card px-4 py-2.5 shadow-sm ring-1 ring-border/50"
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
					{state.receiveMode !== "any_chain" && (
						<>
							<span className="h-px w-6 bg-border" aria-hidden />
							<span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
								<span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">
									3
								</span>
								Verify
							</span>
						</>
					)}
				</div>

				<div className="space-y-4">
					{/* GitHub (subscription) — Step 0 */}
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
									GitHub username (required for subscription)
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
									className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
									className="shrink-0 rounded-xl"
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
									we can link this subscription to your
									account.
								</p>
							)}
						</section>
					)}
					{isSubscription && hasGithub && (
						<p className="text-sm text-muted-foreground">
							Subscribing as:{" "}
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
								<p
									className={`mt-1 text-sm ${
										isUserRejectedRequestError(writeError)
											? "text-muted-foreground"
											: "text-destructive/90"
									}`}
								>
									{(() => {
										if (isUserRejectedRequestError(writeError)) {
											return "You can try again when ready.";
										}
										const msg = writeError?.message ?? "";
										// Gas estimation failed (e.g. RPC returned null) — show friendly message
										if (
											msg.includes("gasLimit") ||
											msg.includes("destructure")
										) {
											return "Transaction could not be prepared. Check your network connection and balance, then try again.";
										}
										return (
											msg ||
											"Transaction was rejected or failed. Check your balance and try again."
										);
									})()}
								</p>
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
							{state.receiveMode !== "any_chain" && (
								<span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
									{networkLabel}
								</span>
							)}
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

					{/* Step 2: Circle Gateway */}
					{state.receiveMode === "any_chain" && (
						<section
							className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 shadow-sm"
							aria-label="Pay with Circle Gateway"
						>
							<div className="flex items-center gap-2">
								<Wallet className="h-5 w-5 text-primary" />
								<h2 className="text-base font-semibold text-foreground">
									Pay with Circle Gateway
								</h2>
							</div>
							<p className="mt-1.5 text-sm text-muted-foreground">
								Payment is received on Arc. Use your unified
								Gateway balance. Need funds? Use the{" "}
								<a
									href="https://faucet.circle.com"
									target="_blank"
									rel="noopener noreferrer"
									className="font-medium text-primary underline underline-offset-2 hover:no-underline"
								>
									Circle Faucet
								</a>{" "}
								then deposit to Gateway on any supported chain.
							</p>

							{/* Step 2a: Source chain */}
							<div className="mt-4">
								<p className="mb-1.5 text-xs font-medium text-muted-foreground">
									1. Select chain where you deposited into Gateway
								</p>
								<div className="flex flex-wrap gap-2">
									{SUPPORTED_CHAINS.map((c) => (
										<Button
											key={c.chainId}
											type="button"
											variant={
												gatewaySourceChainId === c.chainId
													? "default"
													: "outline"
											}
											size="sm"
											onClick={() =>
												setGatewaySourceChainId(c.chainId)
											}
											className="rounded-lg"
										>
											{c.name}
										</Button>
									))}
								</div>
							</div>

							{/* Step 2b: Balance + deposit */}
							<div className="mt-4">
								<p className="mb-1.5 text-xs font-medium text-muted-foreground">
									2. Check balance or deposit
								</p>
								{gatewayDepositDone && (
									<p className="mb-2 text-sm text-primary">
										Deposit complete. Wait 2–5 min for
										finality, then check balance below.
									</p>
								)}
								{isConnected && walletAddress && (
									<div className="flex flex-wrap items-center gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={async () => {
												setGatewayBalanceLoading(true);
												setGatewayBalance(null);
												try {
													const r = await fetch(
														`/api/circle/gateway/balances?depositor=${encodeURIComponent(walletAddress)}`,
													);
													const d = await r.json();
													if (
														r.ok &&
														typeof d.total === "string"
													)
														setGatewayBalance(d.total);
													else setGatewayBalance(null);
												} catch {
													setGatewayBalance(null);
												} finally {
													setGatewayBalanceLoading(false);
												}
											}}
											disabled={gatewayBalanceLoading}
											className="rounded-lg"
										>
											{gatewayBalanceLoading
												? "Checking…"
												: "Check Gateway balance"}
										</Button>
										{gatewayBalance !== null && (
											<span className="text-sm text-muted-foreground">
												Balance:{" "}
												<strong className="text-foreground">
													{gatewayBalance} USDC
												</strong>
												{parseFloat(gatewayBalance) <
													0.11 && (
													<span className="text-amber-600 dark:text-amber-400">
														{" "}
														— need ≥0.11 (wait for
														finality)
													</span>
												)}
											</span>
										)}
									</div>
								)}
								<div className="mt-2 flex flex-wrap items-center gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={handleDepositToGateway}
										disabled={
											!isConnected ||
											isWritePending ||
											!!gatewayDepositRef.current
										}
										className="rounded-lg border-amber-500/40 bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 dark:text-amber-200 dark:hover:bg-amber-500/20"
									>
										{gatewayDepositRef.current
											? gatewayDepositRef.current
													.phase === "approve"
												? "Confirm approve in wallet…"
												: "Confirm deposit in wallet…"
											: `Deposit ${GATEWAY_DEPOSIT_AMOUNT_USDC} USDC to Gateway`}
									</Button>
									<span className="text-xs text-muted-foreground">
										Wallet → Gateway
									</span>
								</div>
							</div>

							{gatewayError && (
								<p className="mt-2 text-sm text-destructive" role="alert">
									{gatewayError}
								</p>
							)}

							{/* Step 2c: Pay CTA */}
							<div className="mt-4">
								<p className="mb-1.5 text-xs font-medium text-muted-foreground">
									3. Pay
								</p>
								<Button
									type="button"
									onClick={handlePayWithGateway}
									disabled={
										!isConnected ||
										subscriptionNeedsGithub ||
										gatewayStep === "loading" ||
										gatewayStep === "sign" ||
										gatewayStep === "request" ||
										isWritePending
									}
									className="w-full rounded-xl py-3 font-medium"
								>
									{!isConnected
										? "Connect wallet"
										: gatewayStep === "loading"
											? "Loading…"
											: gatewayStep === "sign"
												? "Sign in wallet…"
												: gatewayStep === "request"
													? "Requesting attestation…"
													: gatewayStep === "mint" ||
															isWritePending
														? "Confirm mint in wallet…"
														: "Pay with Gateway"}
								</Button>
							</div>
						</section>
					)}

					{/* Step 2 (direct): Pay with wallet + Verify in one card */}
					{state.receiveMode !== "any_chain" && (
						<section
							className="rounded-2xl border border-border bg-card p-4 shadow-sm"
							aria-label="Pay and verify"
						>
							{paymentUri ? (
								<>
									<div className="flex items-center gap-2">
										<Wallet className="h-5 w-5 text-primary" />
										<h2 className="text-base font-semibold text-foreground">
											Pay with your wallet
										</h2>
									</div>
									<p className="mt-1.5 text-sm text-muted-foreground">
										Scan the QR code or open your wallet
										with amount and recipient pre-filled.
									</p>
									<div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
										{qrDataUrl && (
											<div className="shrink-0 overflow-hidden rounded-xl border border-border bg-white p-2.5 shadow-sm">
												{/* eslint-disable-next-line @next/next/no-img-element -- QR data URL */}
												<img
													src={qrDataUrl}
													alt="Payment QR code"
													width={200}
													height={200}
												/>
											</div>
										)}
										<div className="flex flex-1 flex-col gap-2">
											<Button
												type="button"
												onClick={handlePayWithWallet}
												disabled={
													isWritePending ||
													subscriptionNeedsGithub
												}
												className="w-full rounded-xl py-3 font-medium sm:w-auto"
											>
												{!isConnected
													? "Connect wallet"
													: isWritePending
														? "Confirm in wallet…"
														: "Pay with wallet"}
											</Button>
											<p className="text-xs text-muted-foreground">
												{!isConnected
													? `Connect to pay with USDC on ${networkLabel}.`
													: "Opens your wallet with recipient and amount pre-filled."}
											</p>
										</div>
									</div>
								</>
							) : (
								<p className="text-sm text-muted-foreground">
									Send the amount above to the address, then
									paste the transaction hash below to verify.
								</p>
							)}

							{/* Verify: same card, clear separation */}
							<div className="mt-4 border-t border-border pt-4">
								<div className="flex items-center gap-2">
									<Hash className="h-5 w-5 text-muted-foreground" />
									<h3 className="text-sm font-semibold text-foreground">
										Already sent? Verify with transaction hash
									</h3>
								</div>
								<form
									className="mt-2"
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
										className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 font-mono text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
										disabled={state.status === "verifying"}
									/>
									<Button
										type="submit"
										disabled={
											state.status === "confirming" ||
											state.status === "verifying" ||
											subscriptionNeedsGithub
										}
										className="mt-2 w-full rounded-xl py-2.5 font-medium sm:w-auto sm:min-w-[140px]"
									>
										{state.status === "confirming"
											? "Confirming…"
											: state.status === "verifying"
												? "Verifying…"
												: "Verify payment"}
									</Button>
									{subscriptionNeedsGithub && (
										<p className="mt-1.5 text-xs text-muted-foreground">
											Save your GitHub username above
											before verifying.
										</p>
									)}
								</form>
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
