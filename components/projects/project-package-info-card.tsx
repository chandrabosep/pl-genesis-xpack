"use client";

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/ui/copy-button";
import { formatDate, pricingModelLabel, paymentTypeLabel } from "@/lib/utils";
import type { ProjectSummary } from "@/types/projects";
import { Loader2, Pencil, RefreshCw, Check, X } from "lucide-react";

export interface ProjectPackageInfoCardProps {
	project: ProjectSummary;
	editingPaymentAddress: boolean;
	inlinePaymentAddress: string;
	updateLoading: boolean;
	updateError: string | null;
	onInlinePaymentAddressChange: (value: string) => void;
	onSavePaymentAddress: (address: string) => void;
	onCancelEditPaymentAddress: () => void;
	onStartEditPaymentAddress: (address: string) => void;
	rotateLoading: boolean;
	onRotateKeyClick: () => void;
	onRefreshClick?: () => void;
}

function DocRow({
	label,
	description,
	children,
}: {
	label: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="group/doc grid gap-1.5 py-3 first:pt-0 last:pb-0 border-b border-border/60 last:border-0">
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{label}
				</span>
				{description ? (
					<span className="text-xs text-muted-foreground/80">
						{description}
					</span>
				) : null}
			</div>
			<div className="min-w-0">{children}</div>
		</div>
	);
}

export function ProjectPackageInfoCard({
	project,
	editingPaymentAddress,
	inlinePaymentAddress,
	updateLoading,
	updateError,
	onInlinePaymentAddressChange,
	onSavePaymentAddress,
	onCancelEditPaymentAddress,
	onStartEditPaymentAddress,
	rotateLoading,
	onRotateKeyClick,
	onRefreshClick,
}: ProjectPackageInfoCardProps) {
	return (
		<Card
			id="credentials"
			className="rounded-xl border border-border/80 bg-card shadow-sm scroll-mt-6"
		>
			<CardHeader className="space-y-1 pb-2">
				<div className="flex items-center justify-between gap-2">
					<CardTitle className="text-lg font-semibold tracking-tight text-foreground">
						Credentials & settings
					</CardTitle>
					{onRefreshClick && (
						<Button
							variant="ghost"
							size="sm"
							onClick={onRefreshClick}
							aria-label="Refresh project data"
							className="h-8 text-muted-foreground"
						>
							<RefreshCw className="size-3.5" />
							Refresh
						</Button>
					)}
				</div>
				<CardDescription className="text-sm">
					Use these values in your app. Keep your API key secret and
					do not commit it to version control.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-0 pt-0">
				<DocRow label="Package name">
					<p className="font-medium text-foreground">
						{project.name}
					</p>
				</DocRow>

				<DocRow
					label="Project ID"
					description="Use in package.json xpack.projectId"
				>
					<div className="flex flex-wrap items-center gap-2">
						<code className="min-w-0 flex-1 break-all rounded-md bg-muted/80 px-2 py-1.5 text-xs font-mono text-foreground">
							{project.id}
						</code>
						<CopyButton
							value={project.id}
							label="Copy Project ID"
							buttonText="Copy"
							size="xs"
							variant="ghost"
						/>
					</div>
				</DocRow>

				<DocRow
					label="API key"
					description="Keep secret. Use in package.json xpack.apiKey"
				>
					<div className="flex flex-wrap items-center gap-2">
						<code className="min-w-0 flex-1 break-all rounded-md bg-muted/80 px-2 py-1.5 text-xs font-mono text-foreground">
							{project.apiKeyValue ?? "—"}
						</code>
						{project.apiKeyValue && (
							<>
								<CopyButton
									value={project.apiKeyValue}
									label="Copy API key"
									buttonText="Copy"
									size="xs"
									variant="ghost"
								/>
								<Button
									variant="ghost"
									size="sm"
									className="h-8 text-muted-foreground"
									aria-label="Rotate API key"
									onClick={onRotateKeyClick}
									disabled={rotateLoading}
								>
									{rotateLoading ? (
										<Loader2 className="size-3.5 animate-spin" />
									) : (
										<RefreshCw className="size-3.5" />
									)}
									Rotate
								</Button>
							</>
						)}
					</div>
				</DocRow>

				<DocRow
					label="Payment address"
					description="USDC received at this wallet"
				>
					{editingPaymentAddress ? (
						<div className="space-y-2">
							<Input
								value={inlinePaymentAddress}
								onChange={(e) =>
									onInlinePaymentAddressChange(e.target.value)
								}
								placeholder="0x..."
								className="font-mono text-sm max-w-md"
								disabled={updateLoading}
							/>
							{updateError && (
								<p className="text-xs text-destructive">
									{updateError}
								</p>
							)}
							<div className="flex items-center gap-2">
								<Button
									size="sm"
									onClick={() =>
										onSavePaymentAddress(
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
											<Check className="size-3.5" />
											Save
										</>
									)}
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={onCancelEditPaymentAddress}
									disabled={updateLoading}
								>
									<X className="size-3.5" />
									Cancel
								</Button>
							</div>
						</div>
					) : (
						<div className="flex flex-wrap items-center gap-2">
							<code className="break-all font-mono text-sm text-foreground">
								{project.receiveMode === "starknet"
									? project.starknetAddress ??
										"(missing Starknet address)"
									: project.receiveMode === "sui"
										? project.suiAddress ??
											"(missing Sui address)"
										: project.paymentAddress}
							</code>
							<CopyButton
								value={
									project.receiveMode === "starknet"
										? project.starknetAddress ??
											project.paymentAddress
										: project.receiveMode === "sui"
											? project.suiAddress ??
												project.paymentAddress
											: project.paymentAddress
								}
								label="Copy payment address"
								buttonText="Copy"
								size="xs"
								variant="ghost"
							/>
							{project.receiveMode !== "sui" &&
								project.receiveMode !== "starknet" && (
									<Button
										variant="ghost"
										size="icon"
										className="size-8 shrink-0"
										aria-label="Edit payment address"
										onClick={() =>
											onStartEditPaymentAddress(
												project.paymentAddress,
											)
										}
									>
										<Pencil className="size-3.5" />
									</Button>
								)}
						</div>
					)}
				</DocRow>

				<DocRow
					label={
						project.receiveMode === "sui"
							? "Price (SUI)"
							: project.receiveMode === "flow"
								? "Price (FLOW)"
								: "Price (USDC)"
					}
				>
					<p className="font-medium text-foreground">
						{project.price != null
							? `${project.price} ${project.receiveMode === "sui" ? "SUI" : project.receiveMode === "flow" ? "FLOW" : "USDC"}`
							: "—"}
					</p>
				</DocRow>

				<DocRow label="Payment type">
					<Badge variant="secondary">
						{paymentTypeLabel(project.receiveMode)}
					</Badge>
				</DocRow>

				<DocRow label="Pricing model">
					<Badge variant="secondary">
						{pricingModelLabel(project.pricingModel)}
					</Badge>
				</DocRow>

				<DocRow label="Created">
					<p className="text-sm text-muted-foreground">
						{formatDate(project.createdAt)}
					</p>
				</DocRow>
			</CardContent>
		</Card>
	);
}
