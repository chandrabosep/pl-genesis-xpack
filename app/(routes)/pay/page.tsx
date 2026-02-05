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

/** Circle Gateway Minter on Arc (and other EVM testnets). */
const GATEWAY_MINTER_ADDRESS = "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B" as const;
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
const GATEWAY_WALLET_ADDRESS = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9" as const;
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

const BASE_SEPOLIA_CHAIN_ID = 84532;
const ARC_TESTNET_CHAIN_ID = 5042002;

const USDC_BY_CHAIN: Record<number, string> = {
	[BASE_SEPOLIA_CHAIN_ID]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
	[ARC_TESTNET_CHAIN_ID]: "0x3600000000000000000000000000000000000000",
};
const GATEWAY_DEPOSIT_AMOUNT_USDC = 2;
const GATEWAY_DEPOSIT_AMOUNT_UNITS = BigInt(GATEWAY_DEPOSIT_AMOUNT_USDC * 1_000_000);

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
	| ({ status: "verifying" } & ReadyPayload)  // tx mined, checking on our server
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
	const [gatewaySourceChainId, setGatewaySourceChainId] = useState(BASE_SEPOLIA_CHAIN_ID);
	const [gatewayError, setGatewayError] = useState<string | null>(null);
	const [gatewayStep, setGatewayStep] = useState<"idle" | "loading" | "sign" | "request" | "mint">("idle");
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
			});
		} else {
			gatewayDepositRef.current = null;
			setGatewayDepositDone(true);
			setGatewayError(null);
		}
	}, [isReceiptSuccess, txHash, writeContract]);

	// Auto-verify only after tx is mined (receipt exists) so our server finds the receipt
	useEffect(() => {
		if (!isReceiptSuccess || !receipt || !txHash || !payingForSessionRef.current)
			return;
		if (gatewayDepositRef.current) return; // let the deposit effect handle it
		const sessionToken = payingForSessionRef.current;
		const payload = readyPayloadRef.current;
		payingForSessionRef.current = null;
		readyPayloadRef.current = null;
		if (!payload) return;
		queueMicrotask(() =>
			setState({ ...payload, status: "verifying" }),
		);
		const chainId = payload.chainId ?? BASE_SEPOLIA_CHAIN_ID;
		fetch("/api/install/verify", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ sessionToken, transactionHash: txHash, chainId }),
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
		});
	}, [state, isConnected, chain?.id, switchChainAsync, open, writeContract, resetWriteContract]);

	const handlePayWithGateway = useCallback(async () => {
		if (state.status !== "ready" || !walletAddress) return;
		setGatewayError(null);
		setGatewayStep("loading");
		try {
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
			const attestationHex = attestation.startsWith("0x") ? attestation : `0x${attestation}`;
			const sigHex = sig.startsWith("0x") ? sig : `0x${sig}`;
			if (chain?.id !== ARC_TESTNET_CHAIN_ID) {
				await switchChainAsync({ chainId: ARC_TESTNET_CHAIN_ID });
			}
			payingForSessionRef.current = state.sessionToken;
			readyPayloadRef.current = { ...state, chainId: ARC_TESTNET_CHAIN_ID };
			setGatewayStep("mint");
			resetWriteContract?.();
			writeContract({
				address: GATEWAY_MINTER_ADDRESS,
				abi: GATEWAY_MINTER_ABI,
				functionName: "gatewayMint",
				args: [attestationHex as `0x${string}`, sigHex as `0x${string}`],
			});
		} catch (err) {
			setGatewayError(err instanceof Error ? err.message : "Gateway payment failed");
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
			});
		} catch (err) {
			gatewayDepositRef.current = null;
			setGatewayError(err instanceof Error ? err.message : "Deposit failed");
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

	const fetchSession = useCallback(async (token: string) => {
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
			setState({ status: "invalid", error: "Failed to load session" });
		}
	}, [searchParams]);

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
			setGithubError("Enter a valid GitHub username (letters, numbers, hyphens only)");
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
			<main className="mx-auto max-w-lg space-y-6 p-6">
				<h1 className="text-2xl font-semibold">Payment</h1>
				<p className="text-muted-foreground">Loading session…</p>
			</main>
		);
	}

	if (state.status === "invalid") {
		return (
			<main className="mx-auto max-w-lg space-y-6 p-6">
				<h1 className="text-2xl font-semibold">Payment</h1>
				<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
					{state.error}
				</div>
				<p className="text-sm text-muted-foreground">
					Use the payment link provided when you ran the install (e.g.
					from the CLI or docs).
				</p>
			</main>
		);
	}

	if (state.status === "verified") {
		return (
			<main className="mx-auto max-w-lg space-y-6 p-6">
				<h1 className="text-2xl font-semibold">Payment verified</h1>
				<div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100">
					Payment was verified successfully. You can now re-run the
					install command.
				</div>
			</main>
		);
	}

	if (state.status === "verify_error") {
		return (
			<main className="mx-auto max-w-lg space-y-6 p-6">
				<h1 className="text-2xl font-semibold">Payment</h1>
				<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
					{state.error}
				</div>
				<p className="text-sm text-muted-foreground">
					Check the transaction hash and try again, or open the
					payment link again to get a fresh session.
				</p>
				{sessionParam?.trim() && (
					<button
						type="button"
						onClick={() => fetchSession(sessionParam.trim())}
						className="rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
					>
						Try again
					</button>
				)}
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
	const hasGithub =
		!!state.githubUsername || githubSaved;
	const subscriptionNeedsGithub = isSubscription && !hasGithub;

	return (
		<main className="mx-auto max-w-lg space-y-6 p-6">
			<h1 className="text-2xl font-semibold">Complete payment</h1>
			{projectName && (
				<p className="text-muted-foreground">
					Pay for:{" "}
					<span className="font-medium text-foreground">
						{projectName}
					</span>
				</p>
			)}
			{isSubscription && (
				<p className="text-sm text-muted-foreground">
					Subscription is tied to your GitHub identity. After payment you can install from any machine with the same GitHub user.
				</p>
			)}
			{subscriptionNeedsGithub && (
				<div className="space-y-2 rounded-lg border bg-muted/30 p-4">
					<label
						htmlFor="githubUsername"
						className="block text-sm font-medium"
					>
						GitHub username (required for subscription)
					</label>
					<div className="flex gap-2">
						<input
							id="githubUsername"
							type="text"
							value={githubUsername}
							onChange={(e) => {
								setGithubUsername(e.target.value);
								setGithubError(null);
							}}
							placeholder="your-github-username"
							className="flex-1 rounded-md border bg-background px-3 py-2 font-mono text-sm"
							disabled={githubSaving || githubSaved}
						/>
						<button
							type="button"
							onClick={saveGithubUsername}
							disabled={githubSaving || githubSaved || !githubUsername.trim()}
							className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
						>
							{githubSaved ? "Saved" : githubSaving ? "Saving…" : "Save"}
						</button>
					</div>
					{githubError && (
						<p className="text-sm text-destructive">{githubError}</p>
					)}
					{!githubSaved && (
						<p className="text-xs text-muted-foreground">
							Save your GitHub username before paying so we can link this subscription to your account.
						</p>
					)}
				</div>
			)}
			{isSubscription && hasGithub && (
				<p className="text-sm text-muted-foreground">
					Subscribing as: <span className="font-mono font-medium">{state.githubUsername || githubUsername}</span>
				</p>
			)}
			{state.status === "ready" && isWriteError && (
				<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
					<p className="font-medium">Payment failed</p>
					<p className="mt-1 text-sm">
						{writeError?.message ?? "Transaction was rejected or failed. Check your balance and try again."}
					</p>
				</div>
			)}
			<div className="rounded-lg border bg-card p-4 text-card-foreground">
				<dl className="space-y-2">
					<div>
						<dt className="text-sm text-muted-foreground">
							Amount
						</dt>
						<dd className="font-mono font-medium">
							{price} {state.currency ?? "USDC"}
						</dd>
					</div>
					<div>
						<dt className="text-sm text-muted-foreground">
							Pay to address
						</dt>
						<dd className="break-all font-mono text-sm">
							{recipientAddress}
						</dd>
					</div>
					<div>
						<dt className="text-sm text-muted-foreground">
							Network
						</dt>
						<dd className="text-sm">
							{state.chainId === ARC_TESTNET_CHAIN_ID ? "Arc" : "Base Sepolia"}
						</dd>
					</div>
				</dl>
			</div>

			{state.paymentOptions && state.paymentOptions.length > 1 && (
				<div className="space-y-2">
					<p className="text-sm font-medium">Pay with USDC on</p>
					<div className="flex gap-2">
						{state.paymentOptions.map((option) => (
							<button
								key={option.chainId}
								type="button"
								onClick={() => {
									setState({
										...state,
										paymentUri: option.paymentUri,
										chainId: option.chainId,
										tokenAddress: option.tokenAddress,
									});
								}}
								className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
									state.chainId === option.chainId
										? "border-primary bg-primary/10 text-primary"
										: "border-input bg-background hover:bg-muted"
								}`}
							>
								{option.chainName}
							</button>
						))}
					</div>
					<p className="text-xs text-muted-foreground">
						Choose the chain where you have USDC. Your selected address receives funds on that chain.
					</p>
				</div>
			)}

			{state.receiveMode === "any_chain" && (
				<div className="space-y-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
					<p className="text-sm font-medium">Pay with Circle Gateway (cross-chain → Arc)</p>
					<p className="text-xs text-muted-foreground">
						Use your unified USDC balance in Circle Gateway. Funds arrive on Arc as the liquidity hub.
						You must deposit USDC into the Gateway first (e.g.{" "}
						<a
							href="https://faucet.circle.com"
							target="_blank"
							rel="noopener noreferrer"
							className="underline hover:no-underline"
						>
							Circle Faucet
						</a>
						{" "}+ Gateway deposit on Base Sepolia or Arc).
					</p>
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-xs text-muted-foreground">Source chain (Gateway balance):</span>
						<button
							type="button"
							onClick={() => setGatewaySourceChainId(BASE_SEPOLIA_CHAIN_ID)}
							className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
								gatewaySourceChainId === BASE_SEPOLIA_CHAIN_ID
									? "border-primary bg-primary/10 text-primary"
									: "border-input bg-background hover:bg-muted"
							}`}
						>
							Base Sepolia
						</button>
						<button
							type="button"
							onClick={() => setGatewaySourceChainId(ARC_TESTNET_CHAIN_ID)}
							className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
								gatewaySourceChainId === ARC_TESTNET_CHAIN_ID
									? "border-primary bg-primary/10 text-primary"
									: "border-input bg-background hover:bg-muted"
							}`}
						>
							Arc
						</button>
					</div>
					{gatewayDepositDone && (
						<p className="text-sm text-green-600 dark:text-green-400">
							Deposit complete. Use the <strong>same chain</strong> above as source. Wait 2–5 min (or up to ~20 min) for finality, then check balance below.
						</p>
					)}
					{isConnected && walletAddress && (
						<div className="flex flex-wrap items-center gap-2">
							<button
								type="button"
								onClick={async () => {
									setGatewayBalanceLoading(true);
									setGatewayBalance(null);
									try {
										const r = await fetch(
											`/api/circle/gateway/balances?depositor=${encodeURIComponent(walletAddress)}`,
										);
										const d = await r.json();
										if (r.ok && typeof d.total === "string") setGatewayBalance(d.total);
										else setGatewayBalance(null);
									} catch {
										setGatewayBalance(null);
									} finally {
										setGatewayBalanceLoading(false);
									}
								}}
								disabled={gatewayBalanceLoading}
								className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
							>
								{gatewayBalanceLoading ? "Checking…" : "Check Gateway balance"}
							</button>
							{gatewayBalance !== null && (
								<span className="text-xs text-muted-foreground">
									Gateway balance: <strong>{gatewayBalance} USDC</strong>
									{parseFloat(gatewayBalance) < 0.11 && " — need ≥0.11 to pay (wait for finality)."}
								</span>
							)}
						</div>
					)}
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={handleDepositToGateway}
							disabled={
								!isConnected ||
								isWritePending ||
								!!gatewayDepositRef.current
							}
							className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
						>
							{gatewayDepositRef.current
								? gatewayDepositRef.current.phase === "approve"
									? "Confirm approve in wallet…"
									: "Confirm deposit in wallet…"
								: `Deposit ${GATEWAY_DEPOSIT_AMOUNT_USDC} USDC to Gateway`}
						</button>
						<span className="text-xs text-muted-foreground">
							Uses wallet USDC on selected chain → Gateway balance
						</span>
					</div>
					{gatewayError && (
						<p className="text-sm text-destructive">{gatewayError}</p>
					)}
					<button
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
						className="rounded-md border border-primary bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
					>
						{!isConnected
							? "Connect wallet"
							: gatewayStep === "loading"
								? "Loading…"
								: gatewayStep === "sign"
									? "Sign in wallet…"
									: gatewayStep === "request"
										? "Requesting attestation…"
										: gatewayStep === "mint" || isWritePending
											? "Confirm mint in wallet…"
											: "Pay with Gateway"}
					</button>
				</div>
			)}

			{paymentUri ? (
				<div className="space-y-3">
					<p className="text-sm font-medium">
						Scan or open in wallet
					</p>
					<p className="text-sm text-muted-foreground">
						Scan the QR code with your wallet app, or tap the link
						to open your wallet with the amount pre-filled.
					</p>
					<div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
						{qrDataUrl && (
							<div className="shrink-0 rounded-lg border bg-white p-2">
								{/* eslint-disable-next-line @next/next/no-img-element -- QR data URL not supported by next/image */}
								<img
									src={qrDataUrl}
									alt="Payment QR code"
									width={256}
									height={256}
								/>
							</div>
						)}
						<div className="flex flex-col gap-2">
							<button
								type="button"
								onClick={handlePayWithWallet}
								disabled={isWritePending || subscriptionNeedsGithub}
								className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
							>
								{!isConnected
									? "Connect wallet"
									: isWritePending
										? "Confirm in wallet…"
										: "Pay with wallet"}
							</button>
							<p className="text-xs text-muted-foreground">
								{!isConnected
									? `Connect to pay with USDC on ${state.chainId === ARC_TESTNET_CHAIN_ID ? "Arc" : "Base Sepolia"}.`
									: "Opens your wallet to send USDC (recipient and amount pre-filled)."}
							</p>
						</div>
					</div>
				</div>
			) : (
				<p className="text-sm text-muted-foreground">
					Send the amount above to the address, then paste the
					transaction hash below to verify.
				</p>
			)}

			{(state.status === "confirming" || state.status === "verifying") && (
				<p className="text-sm text-muted-foreground">
					{state.status === "confirming"
						? "Waiting for transaction to be confirmed on chain…"
						: "Checking that payment reached our address on chain…"}
				</p>
			)}
			<form
				className="space-y-4 rounded-lg border p-4"
				onSubmit={(e) => {
					if (subscriptionNeedsGithub) {
						e.preventDefault();
						return;
					}
					handleVerify(e);
				}}
			>
				<div>
					<label
						htmlFor="transactionHash"
						className="mb-1 block text-sm font-medium"
					>
						Transaction hash
					</label>
					<input
						id="transactionHash"
						name="transactionHash"
						type="text"
						required
						placeholder="0x…"
						className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
						disabled={state.status === "verifying"}
					/>
				</div>
				<button
					type="submit"
					disabled={
						state.status === "confirming" ||
						state.status === "verifying" ||
						subscriptionNeedsGithub
					}
					className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
				>
					{state.status === "confirming"
						? "Confirming…"
						: state.status === "verifying"
							? "Verifying…"
							: "Verify payment"}
				</button>
				{subscriptionNeedsGithub && (
					<p className="text-xs text-muted-foreground">
						Save your GitHub username above before verifying payment.
					</p>
				)}
			</form>
		</main>
	);
}
