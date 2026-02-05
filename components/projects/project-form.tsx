"use client";

import { PricingModel } from "@/types/constants";
import { ProjectSummary } from "@/types/projects";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const pricingOptions: PricingModel[] = ["per_device", "subscription"];
type ReceiveMode = "base" | "any_chain" | "sui";

function pricingOptionLabel(model: PricingModel): string {
	const labels: Record<PricingModel, string> = {
		per_device: "Per device",
		subscription: "Subscription",
	};
	return labels[model] ?? model;
}

export function ProjectForm(props: {
	name: string;
	price: string;
	paymentAddress: string;
	pricingModel: PricingModel;
	receiveMode?: ReceiveMode;
	unifiedReceiveAddress?: string;
	suiAddress?: string;
	onNameChange: (value: string) => void;
	onPriceChange: (value: string) => void;
	onPaymentAddressChange: (value: string) => void;
	onPricingChange: (value: PricingModel) => void;
	onReceiveModeChange?: (value: ReceiveMode) => void;
	onUnifiedReceiveAddressChange?: (value: string) => void;
	onSuiAddressChange?: (value: string) => void;
	onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
	const receiveMode = props.receiveMode ?? "base";
	const unifiedReceiveAddress = props.unifiedReceiveAddress ?? "";
	const suiAddress = props.suiAddress ?? "";
	const isAnyChain = receiveMode === "any_chain";
	const isSui = receiveMode === "sui";

	return (
		<form
			className="space-y-3 rounded border p-4"
			onSubmit={props.onSubmit}
		>
			<div className="flex flex-col gap-1">
				<label className="text-sm font-medium">Project name</label>
				<input
					className="rounded border px-3 py-2"
					value={props.name}
					onChange={(event) => props.onNameChange(event.target.value)}
					required
				/>
			</div>
			<div className="flex flex-col gap-1">
				<label className="text-sm font-medium">
					Price ({isSui ? "SUI" : "USDC"})
				</label>
				<input
					className="rounded border px-3 py-2"
					type="number"
					min="0"
					step="0.01"
					placeholder="e.g. 0.1, 1, 10"
					value={props.price}
					onChange={(event) =>
						props.onPriceChange(event.target.value)
					}
					required
				/>
			</div>
			<div className="flex flex-col gap-2">
				<label className="text-sm font-medium">Accept payments on</label>
				<div className="flex flex-wrap gap-3">
					<label className="flex items-center gap-2">
						<input
							type="radio"
							name="receiveMode"
							checked={receiveMode === "base"}
							onChange={() => props.onReceiveModeChange?.("base")}
							className="rounded border-gray-300"
						/>
						<span className="text-sm">Base</span>
					</label>
					<label className="flex items-center gap-2">
						<input
							type="radio"
							name="receiveMode"
							checked={receiveMode === "any_chain"}
							onChange={() => props.onReceiveModeChange?.("any_chain")}
							className="rounded border-gray-300"
						/>
						<span className="text-sm">Any chain (Base + Arc)</span>
					</label>
					<label className="flex items-center gap-2">
						<input
							type="radio"
							name="receiveMode"
							checked={receiveMode === "sui"}
							onChange={() => props.onReceiveModeChange?.("sui")}
							className="rounded border-gray-300"
						/>
						<span className="text-sm">Sui</span>
					</label>
				</div>
				<p className="text-xs text-muted-foreground">
					{receiveMode === "base" && "USDC on Base Sepolia to your address below."}
					{receiveMode === "any_chain" && "USDC on Base or Arc to your address below."}
					{receiveMode === "sui" && "SUI on Sui to your address below."}
				</p>
			</div>
			{!isSui && (
				<div className="flex flex-col gap-1">
					<label className="text-sm font-medium">
						{receiveMode === "base" ? "USDC payment address (Base Sepolia)" : "USDC receive address (Base + Arc)"}
					</label>
					<input
						className="rounded border px-3 py-2 font-mono text-sm"
						value={receiveMode === "base" ? props.paymentAddress : unifiedReceiveAddress || props.paymentAddress}
						onChange={(event) => {
							const v = event.target.value;
							props.onPaymentAddressChange(v);
							if (isAnyChain) props.onUnifiedReceiveAddressChange?.(v);
						}}
						placeholder="0x…"
						required
					/>
					{isAnyChain && (
						<p className="text-xs text-muted-foreground">
							Same address receives USDC when users pay on Base Sepolia or Arc.
						</p>
					)}
				</div>
			)}
			{isSui && (
				<div className="flex flex-col gap-1">
					<label className="text-sm font-medium">Sui receive address</label>
					<input
						className="rounded border px-3 py-2 font-mono text-sm"
						value={suiAddress}
						onChange={(event) => props.onSuiAddressChange?.(event.target.value)}
						placeholder="0x… (64 hex chars)"
						required
					/>
					<p className="text-xs text-muted-foreground">
						Users pay in SUI to this address on Sui {process.env.NEXT_PUBLIC_SUI_NETWORK === "testnet" ? "testnet" : "mainnet"}.
					</p>
				</div>
			)}
			<div className="flex flex-col gap-1">
				<label className="text-sm font-medium">Pricing model</label>
				<Select
					value={props.pricingModel}
					onValueChange={(value) =>
						props.onPricingChange(value as PricingModel)
					}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Select pricing model" />
					</SelectTrigger>
					<SelectContent>
						{pricingOptions.map((option) => (
							<SelectItem key={option} value={option}>
								{pricingOptionLabel(option)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<button
				type="submit"
				className="rounded bg-black px-4 py-2 text-white"
				aria-label="create-project"
			>
				Create project
			</button>
		</form>
	);
}

export function ProjectList(props: {
	projects: ProjectSummary[];
	onRotate: (projectId: string) => Promise<void>;
}) {
	if (!props.projects.length) {
		return <p className="text-sm text-neutral-600">No projects yet.</p>;
	}

	return (
		<div className="space-y-3">
			{props.projects.map((project) => (
				<div
					key={project.id}
					className="flex flex-col gap-2 rounded border p-4"
				>
					<div className="flex items-center justify-between">
						<div className="flex-1 space-y-2">
							<p className="text-sm font-semibold">
								{project.name}
							</p>
							<p className="text-xs text-neutral-600">
								{project.pricingModel} • Price:{" "}
								{project.price ?? 0}
							</p>
							<p className="text-xs text-neutral-600 break-all">
								{project.receiveMode === "sui"
									? `Sui address: ${project.suiAddress ?? "not set"}`
									: `Address: ${project.paymentAddress ?? "not set"}`}
							</p>
							<div className="mt-3 space-y-1 rounded border bg-neutral-50 p-3">
								<p className="text-xs font-medium text-neutral-900">
									Add to package.json xpack:
								</p>
								<p className="text-xs text-neutral-700 break-all font-mono">
									&quot;projectId&quot;: &quot;{project.id}&quot;
								</p>
								{project.apiKeyValue ? (
									<p className="text-xs text-neutral-700 break-all font-mono">
										&quot;apiKey&quot;: &quot;
										{project.apiKeyValue}&quot;
									</p>
								) : null}
							</div>
						</div>
						<button
							className="rounded border px-3 py-1 text-sm"
							onClick={() => props.onRotate(project.id)}
						>
							Rotate API key
						</button>
					</div>
				</div>
			))}
		</div>
	);
}
