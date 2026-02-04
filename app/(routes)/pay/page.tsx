"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { useAppKit } from "@reown/appkit/react";

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
};

type SessionState =
	| { status: "loading" }
	| { status: "invalid"; error: string }
	| ({ status: "ready" } & ReadyPayload)
	| ({ status: "verifying" } & ReadyPayload)
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

	const { isConnected, chain } = useAccount();
	const { switchChainAsync } = useSwitchChain();
	const { open } = useAppKit();
	const {
		writeContract,
		data: txHash,
		isPending: isWritePending,
	} = useWriteContract();

	const paymentUri =
		state.status === "ready" || state.status === "verifying"
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

	// Auto-verify when we get tx hash from wagmi writeContract (same session we triggered pay for)
	useEffect(() => {
		if (!txHash || !payingForSessionRef.current) return;
		const sessionToken = payingForSessionRef.current;
		const payload = readyPayloadRef.current;
		payingForSessionRef.current = null;
		readyPayloadRef.current = null;
		if (!payload) return;
		queueMicrotask(() =>
			setState({ ...payload, status: "verifying" }),
		);
		fetch("/api/install/verify", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ sessionToken, transactionHash: txHash }),
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
	}, [txHash]);

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

		if (chain?.id !== BASE_SEPOLIA_CHAIN_ID) {
			try {
				await switchChainAsync({ chainId: BASE_SEPOLIA_CHAIN_ID });
			} catch {
				return;
			}
		}

		payingForSessionRef.current = sessionToken;
		readyPayloadRef.current = state;
		writeContract({
			address: tokenAddress as `0x${string}`,
			abi: ERC20_TRANSFER_ABI,
			functionName: "transfer",
			args: [recipient as `0x${string}`, BigInt(amountUnits)],
		});
	}, [state, isConnected, chain?.id, switchChainAsync, open, writeContract]);

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
		try {
			const res = await fetch("/api/install/verify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sessionToken: state.sessionToken,
					transactionHash: txHash,
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

	// state.status === "ready" | "verifying" (both have ReadyPayload)
	if (state.status !== "ready" && state.status !== "verifying") return null;
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
						<dd className="text-sm">Base Sepolia</dd>
					</div>
				</dl>
			</div>

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
									? "Connect to pay with USDC on Base Sepolia."
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
					disabled={state.status === "verifying" || subscriptionNeedsGithub}
					className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
				>
					{state.status === "verifying"
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
