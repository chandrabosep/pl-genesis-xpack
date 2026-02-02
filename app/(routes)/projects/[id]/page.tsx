"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PricingModel } from "@/types/constants";
import type { ProjectSummary } from "@/types/projects";
import { useWalletAddress } from "@/lib/auth/use-wallet-address";
import { formatDate } from "@/lib/utils";
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	Copy,
	Loader2,
	ArrowLeft,
	Pencil,
	Trash2,
	RefreshCw,
	Check,
	X,
} from "lucide-react";

const PREINSTALL_SCRIPT = `const crypto = require("crypto");
const path = require("path");
const { hostname, platform } = require("os");

const pkg = require(path.join(__dirname, "package.json"));
const xpack = pkg.xpack || {};
const projectId = xpack.projectId;
const apiKey = xpack.apiKey;
const apiHost = normalizeHost(xpack.host);
const docsUrl = xpack.docsUrl;

function deviceFingerprint() {
	const raw = \`\${hostname()}-\${platform()}\`;
	return crypto.createHash("sha256").update(raw).digest("hex");
}

async function startInstall() {
	if (!projectId || !apiKey) {
		console.error("Missing xpack config. Add xpack.projectId and xpack.apiKey to package.json.");
		process.exit(1);
	}
	const version = pkg.version || "0.0.0";
	console.log(\`Validating install against \${apiHost}.\`);
	const response = await fetch(\`\${apiHost}/api/install/start\`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			projectId,
			apiKey,
			version,
			deviceId: deviceFingerprint(),
		}),
	});

	if (response.status === 200) {
		console.log("Install allowed.");
		return;
	}

	if (response.status === 402) {
		const payload = await response.json();
		const price = payload.payment?.price ?? "0";
		const session = payload.payment?.sessionToken ?? "n/a";
		const payUrl =
			session && apiHost
				? \`\${apiHost}/pay?session=\${session}\`
				: (docsUrl ?? "not provided");

		// ANSI colors (work in most terminals)
		const R = "\\x1b[0m";
		const BOLD = "\\x1b[1m";
		const DIM = "\\x1b[2m";
		const UNDERLINE = "\\x1b[4m";
		const GOLD = "\\x1b[93m";
		const GREEN = "\\x1b[92m";
		const CYAN = "\\x1b[96m";
		const MAGENTA = "\\x1b[95m";
		const BOX = "\\x1b[90m";
		const SEP = "▓▓".repeat(22);

		// Use stdout so npm shows this as notice/info, not "npm error"
		console.log("");
		console.log(\`  \${BOX}\${SEP}\${R}\`);
		console.log("");
		console.log("     💳  PAYMENT REQUIRED");
		console.log("     Pay below to unlock this package.");
		console.log("");
		console.log(\`  \${BOX}\${SEP}\${R}\`);
		console.log("");
		console.log("     ►  PAY HERE  —  Open in browser or copy this link:");
		console.log("");
		console.log(\`  \${BOX}\${SEP}\${R}\`);
		console.log("");
		console.log(\`  \${CYAN}\${BOLD}\${UNDERLINE}\${payUrl}\${R}\`);
		console.log("");
		console.log(\`  \${DIM}↑ Copy the full URL above (one line). If it wrapped, paste both parts together.\${R}\`);
		console.log("");
		console.log(\`  \${BOX}\${SEP}\${R}\`);
		console.log(\`     \${BOX}\${R}\`);
		console.log(\`     \${MAGENTA}Price: \${String(price)}\${R}\`);
		console.log(\`     After payment, run:  \${BOLD}npm install\${R}\`);
		console.log("");
		console.log(\`  \${BOX}\${SEP}\${R}\`);
		console.log("");
		process.exit(1);
	}

	const text = await response.text();
	console.error("Unexpected response:", text);
	process.exit(1);
}

startInstall().catch((error) => {
	console.error("preinstall failed:", error);
	process.exit(1);
});

function normalizeHost(host) {
	return host.replace(/[/.]+$/, "").replace(/\\/+$/, "");
}
`;

function pricingModelLabel(model: PricingModel): string {
	const labels: Record<PricingModel, string> = {
		per_device: "Per device",
		subscription: "Subscription",
	};
	return labels[model] ?? model;
}

function CopyButton({
	value,
	label = "Copy",
	buttonText = "Copy",
	className,
}: {
	value: string;
	label?: string;
	buttonText?: string;
	className?: string;
}) {
	const [copied, setCopied] = useState(false);
	const copy = () => {
		void navigator.clipboard.writeText(value).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	};
	return (
		<Button
			type="button"
			variant="outline"
			size="xs"
			className={className}
			onClick={copy}
			aria-label={label}
		>
			{copied ? (
				<span className="text-green-600">Copied!</span>
			) : (
				<>
					<Copy className="size-3" />
					{buttonText}
				</>
			)}
		</Button>
	);
}

export default function ProjectDetailPage() {
	const params = useParams();
	const router = useRouter();
	const id = typeof params.id === "string" ? params.id : "";
	const walletAddress = useWalletAddress();

	const [project, setProject] = useState<ProjectSummary | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Inline edit payment address
	const [editingPaymentAddress, setEditingPaymentAddress] = useState(false);
	const [inlinePaymentAddress, setInlinePaymentAddress] = useState("");
	const [updateLoading, setUpdateLoading] = useState(false);
	const [updateError, setUpdateError] = useState<string | null>(null);

	// Rotate key
	const [rotateLoading, setRotateLoading] = useState(false);
	const [rotateConfirmOpen, setRotateConfirmOpen] = useState(false);

	// Remove
	const [removeOpen, setRemoveOpen] = useState(false);
	const [removeLoading, setRemoveLoading] = useState(false);

	const fetchProject = useCallback(async () => {
		if (!id || !walletAddress) {
			setProject(null);
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/projects/${id}`, {
				headers: { "x-wallet-address": walletAddress },
			});
			if (res.status === 404) {
				setError("Project not found");
				setProject(null);
				return;
			}
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error ?? "Failed to load project");
			}
			const data = (await res.json()) as ProjectSummary;
			setProject(data);
		} catch (e) {
			setError((e as Error).message);
			setProject(null);
		} finally {
			setLoading(false);
		}
	}, [id, walletAddress]);

	useEffect(() => {
		void fetchProject();
	}, [fetchProject]);

	const handleUpdatePaymentAddress = async (address: string) => {
		if (!id || !walletAddress || !address.trim()) return;
		setUpdateLoading(true);
		setUpdateError(null);
		try {
			const res = await fetch("/api/projects", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					"x-wallet-address": walletAddress,
				},
				body: JSON.stringify({
					projectId: id,
					paymentAddress: address.trim(),
				}),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error ?? "Update failed");
			}
			setEditingPaymentAddress(false);
			void fetchProject();
		} catch (e) {
			setUpdateError((e as Error).message);
		} finally {
			setUpdateLoading(false);
		}
	};

	const handleRotateKey = async () => {
		if (!id || !walletAddress) return;
		setRotateConfirmOpen(false);
		setRotateLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/projects", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					"x-wallet-address": walletAddress,
				},
				body: JSON.stringify({ projectId: id }),
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error ?? "Rotate failed");
			}
			void fetchProject();
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setRotateLoading(false);
		}
	};

	const handleRemove = async () => {
		if (!id || !walletAddress) return;
		setRemoveLoading(true);
		try {
			const res = await fetch(
				`/api/projects?projectId=${encodeURIComponent(id)}`,
				{
					method: "DELETE",
					headers: { "x-wallet-address": walletAddress },
				},
			);
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error ?? "Remove failed");
			}
			router.push("/projects");
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setRemoveLoading(false);
		}
	};

	if (!walletAddress) {
		return (
			<main className="p-6">
				<p className="text-sm text-muted-foreground">
					Connect your wallet to view this project.
				</p>
				<Button variant="link" asChild className="mt-2 pl-0">
					<Link href="/projects">Back to Projects</Link>
				</Button>
			</main>
		);
	}

	if (loading) {
		return (
			<main className="p-6 w-full space-y-6">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div>
							<div className="h-7 w-40 bg-muted rounded mb-2 animate-pulse"></div>
							<div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
						</div>
					</div>
					<div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
				</div>
				<div className="space-y-4">
					<div className="h-40 bg-muted rounded-lg animate-pulse" />
					<div className="h-10 w-1/3 bg-muted rounded animate-pulse" />
				</div>
			</main>
		);
	}

	if (error || !project) {
		return (
			<main className="p-6 space-y-4">
				<p className="text-sm text-destructive">
					{error ?? "Project not found"}
				</p>
				<Button variant="outline" asChild>
					<Link href="/projects">
						<ArrowLeft className="size-4" />
						Back to Projects
					</Link>
				</Button>
			</main>
		);
	}

	return (
		<main className="p-6 w-full space-y-6">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div>
						<h1 className="text-2xl font-semibold">
							{project.name}
						</h1>
						<p className="text-sm text-muted-foreground">
							Package details and actions
						</p>
					</div>
				</div>
				<Button
					variant="outline"
					size="icon"
					className="text-destructive bg-destructive/10 hover:bg-destructive/10 hover:text-destructive"
					aria-label="Remove package"
					onClick={() => {
						setError(null);
						setRemoveOpen(true);
					}}
				>
					<Trash2 className="size-4" />
				</Button>
			</div>

			{error ? <p className="text-sm text-destructive">{error}</p> : null}

			<Card>
				<CardContent className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-4">
							<div>
								<Label className="text-muted-foreground">
									Package name
								</Label>
								<p className="mt-1 font-medium">
									{project.name}
								</p>
							</div>
							<div>
								<Label className="text-muted-foreground">
									Price (USDC)
								</Label>
								<p className="mt-1 font-medium">
									{project.price != null
										? `${project.price} USDC`
										: "—"}
								</p>
							</div>
							<div>
								<Label className="text-muted-foreground">
									Payment address
								</Label>
								{editingPaymentAddress ? (
									<div className="mt-2 space-y-2">
										<Input
											value={inlinePaymentAddress}
											onChange={(e) =>
												setInlinePaymentAddress(
													e.target.value,
												)
											}
											placeholder="0x..."
											className="font-mono text-sm"
											disabled={updateLoading}
										/>
										{updateError && (
											<p className="text-xs text-destructive">
												{updateError}
											</p>
										)}
										<div className="flex items-center gap-2">
											<Button
												size="xs"
												onClick={() =>
													void handleUpdatePaymentAddress(
														inlinePaymentAddress,
													)
												}
												disabled={
													updateLoading ||
													!inlinePaymentAddress.trim()
												}
											>
												{updateLoading ? (
													<Loader2 className="size-4 animate-spin" />
												) : (
													<>
														<Check className="size-3" />
														Save
													</>
												)}
											</Button>
											<Button
												size="xs"
												variant="outline"
												onClick={() => {
													setEditingPaymentAddress(
														false,
													);
													setUpdateError(null);
												}}
												disabled={updateLoading}
											>
												<X className="size-3" />
												Cancel
											</Button>
										</div>
									</div>
								) : (
									<div className="mt-1 flex items-center gap-2">
										<p className="break-all font-mono text-sm">
											{project.paymentAddress}
										</p>
										<Button
											variant="ghost"
											size="icon"
											className="size-7 shrink-0"
											aria-label="Update payment address"
											onClick={() => {
												setInlinePaymentAddress(
													project.paymentAddress,
												);
												setUpdateError(null);
												setEditingPaymentAddress(true);
											}}
										>
											<Pencil className="size-3.5" />
										</Button>
									</div>
								)}
							</div>
							<div>
								<Label className="text-muted-foreground">
									Project ID
								</Label>
								<p className="mt-1 break-all font-mono text-sm">
									{project.id}
								</p>
							</div>
							<div>
								<Label className="text-muted-foreground">
									API key
								</Label>
								<div className="mt-2 flex flex-wrap items-center gap-2">
									<code className="flex-1 min-w-0 break-all rounded bg-muted px-2 py-1.5 text-xs font-mono">
										{project.apiKeyValue ?? "—"}
									</code>
									{project.apiKeyValue && (
										<CopyButton
											value={project.apiKeyValue}
											label="Copy API key"
										/>
									)}
									<Button
										variant="ghost"
										size="icon"
										className="size-7 shrink-0"
										aria-label="Rotate API key"
										onClick={() =>
											setRotateConfirmOpen(true)
										}
										disabled={rotateLoading}
									>
										{rotateLoading ? (
											<Loader2 className="size-3.5 animate-spin" />
										) : (
											<RefreshCw className="size-3.5" />
										)}
									</Button>
								</div>
							</div>
						</div>
						<div className="space-y-4 sm:pl-4">
							<div>
								<Label className="text-muted-foreground">
									Pricing model
								</Label>
								<div className="mt-1">
									<Badge variant="secondary">
										{pricingModelLabel(
											project.pricingModel,
										)}
									</Badge>
								</div>
							</div>
							<div>
								<Label className="text-muted-foreground">
									Creation date
								</Label>
								<p className="mt-1 font-medium">
									{formatDate(project.createdAt)}
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* How to add code to the package */}
			<Card>
				<CardHeader>
					<CardTitle>How to add code to the package</CardTitle>
					<CardDescription>
						Follow these steps to integrate payment validation into your package.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<p className="font-medium">Step 1</p>
						<p className="text-sm text-muted-foreground">
							Open your package in VSCode (or any editor).
						</p>
					</div>

					<div className="space-y-2">
						<p className="font-medium">Step 2</p>
						<p className="text-sm text-muted-foreground">
							Create a file named <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">preinstall.js</code> in your package root and paste the following code:
						</p>
						<div className="relative">
							<pre className="max-h-80 overflow-auto rounded-lg border bg-muted/50 p-4 text-xs font-mono">
								<code className="whitespace-pre">{PREINSTALL_SCRIPT}</code>
							</pre>
							<div className="absolute right-2 top-2">
								<CopyButton
									value={PREINSTALL_SCRIPT}
									label="Copy preinstall script"
									buttonText="Copy script"
								/>
							</div>
						</div>
					</div>

					<div className="space-y-3">
						<p className="font-medium">Step 3</p>
						<p className="text-sm text-muted-foreground">
							Add or update the following in your <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">package.json</code>:
						</p>
						<ol className="list-inside list-decimal space-y-3 text-sm text-muted-foreground">
							<li>
								<span className="font-medium text-foreground">Preinstall script</span> (use <code className="rounded bg-muted px-1 py-0.5 font-mono">preinstall</code>, not <code className="rounded bg-muted px-1 py-0.5 font-mono">install</code>):
								<pre className="mt-1 overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs">
									{`"preinstall": "node ./preinstall.js"`}
								</pre>
							</li>
							<li>
								<span className="font-medium text-foreground">Publish only the script</span>:
								<pre className="mt-1 overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs">
									{`"files": ["preinstall.js"]`}
								</pre>
							</li>
							<li>
								<span className="font-medium text-foreground">Minimum Node version</span> (needed for <code className="rounded bg-muted px-1 py-0.5 font-mono">fetch</code>):
								<pre className="mt-1 overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs">
									{`"engines": {
  "node": ">=18.0.0"
}`}
								</pre>
							</li>
							<li>
								<span className="font-medium text-foreground">xpack config</span> (projectId and apiKey — no .env needed):
								<pre className="mt-1 overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs">
									{`"xpack": {
  "projectId": "YOUR_PROJECT_ID",
  "apiKey": "YOUR_API_KEY",
  "host": "https://yourapp.com"
}`}
								</pre>
							</li>
							<li>
								<span className="font-medium text-foreground">Location:</span> Put <code className="rounded bg-muted px-1 py-0.5 font-mono">preinstall.js</code> in your package root (same folder as <code className="rounded bg-muted px-1 py-0.5 font-mono">package.json</code>).
							</li>
						</ol>
						<p className="mt-3 text-sm font-medium text-foreground">Example package.json</p>
						<div className="relative mt-1">
							<pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 text-xs font-mono">
								<code>{`{
  "name": "your-package-name",
  "version": "1.0.0",
  "scripts": {
    "preinstall": "node ./preinstall.js"
  },
  "files": ["preinstall.js"],
  "engines": {
    "node": ">=18.0.0"
  },
  "xpack": {
    "projectId": "YOUR_PROJECT_ID",
    "apiKey": "YOUR_API_KEY",
    "host": "https://yourapp.com"
  }
}`}</code>
							</pre>
							<div className="absolute right-2 top-2">
								<CopyButton
									value={`{
  "name": "your-package-name",
  "version": "1.0.0",
  "scripts": {
    "preinstall": "node ./preinstall.js"
  },
  "files": ["preinstall.js"],
  "engines": {
    "node": ">=18.0.0"
  },
  "xpack": {
    "projectId": "YOUR_PROJECT_ID",
    "apiKey": "YOUR_API_KEY",
    "host": "https://yourapp.com"
  }
}`}
									label="Copy example package.json"
									buttonText="Copy"
								/>
							</div>
						</div>
					</div>

					<p className="text-sm text-muted-foreground">
						Add <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">xpack.projectId</code> and <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">xpack.apiKey</code> to your <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">package.json</code> (use the Project ID and API key from this page). No .env required.
					</p>
				</CardContent>
			</Card>

			{/* Rotate API key warning */}
			<AlertDialog
				open={rotateConfirmOpen}
				onOpenChange={setRotateConfirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Rotate API key?</AlertDialogTitle>
						<AlertDialogDescription>
							A new API key will be generated. The current key
							will stop working immediately. Make sure to update
							your integration with the new key after rotating.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => void handleRotateKey()}
							disabled={rotateLoading}
						>
							{rotateLoading ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<>
									<RefreshCw className="size-4" />
									Rotate key
								</>
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Remove package confirm */}
			<AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Remove this package?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This will deactivate the project and remove all
							associated data. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => void handleRemove()}
							disabled={removeLoading}
						>
							{removeLoading ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<>
									<Trash2 className="size-4" />
									Remove
								</>
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</main>
	);
}
