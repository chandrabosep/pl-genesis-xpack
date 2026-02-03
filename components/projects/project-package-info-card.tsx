"use client";

import {
	Card,
	CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/ui/copy-button";
import { formatDate, pricingModelLabel } from "@/lib/utils";
import type { ProjectSummary } from "@/types/projects";
import { Loader2, Pencil, RefreshCw, Check, X } from "lucide-react";

export interface ProjectPackageInfoCardProps {
	project: ProjectSummary;
	/** Inline edit payment address */
	editingPaymentAddress: boolean;
	inlinePaymentAddress: string;
	updateLoading: boolean;
	updateError: string | null;
	onInlinePaymentAddressChange: (value: string) => void;
	onSavePaymentAddress: (address: string) => void;
	onCancelEditPaymentAddress: () => void;
	onStartEditPaymentAddress: (address: string) => void;
	/** Rotate API key */
	rotateLoading: boolean;
	onRotateKeyClick: () => void;
	/** Optional manual refetch (e.g. Refresh button) */
	onRefreshClick?: () => void;
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
		<Card>
			<CardContent className="space-y-4">
				{onRefreshClick && (
					<div className="flex justify-end">
						<Button
							variant="outline"
							size="sm"
							onClick={onRefreshClick}
							aria-label="Refresh project data"
						>
							<RefreshCw className="size-3.5" />
							Refresh
						</Button>
					</div>
				)}
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-4">
						<div>
							<Label className="text-muted-foreground">
								Package name
							</Label>
							<p className="mt-1 font-medium">{project.name}</p>
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
											onInlinePaymentAddressChange(
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
													<Check className="size-3" />
													Save
												</>
											)}
										</Button>
										<Button
											size="xs"
											variant="outline"
											onClick={onCancelEditPaymentAddress}
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
										onClick={() =>
											onStartEditPaymentAddress(
												project.paymentAddress,
											)
										}
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
								<code className="min-w-0 flex-1 break-all rounded bg-muted px-2 py-1.5 text-xs font-mono">
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
									onClick={onRotateKeyClick}
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
									{pricingModelLabel(project.pricingModel)}
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
	);
}
