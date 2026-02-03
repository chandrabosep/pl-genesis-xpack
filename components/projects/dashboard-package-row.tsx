"use client";

import { useState } from "react";
import type { ProjectSummary } from "@/types/projects";
import { pricingModelLabel } from "@/lib/utils";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { DashboardPackageCard } from "./dashboard-package-card";
import { Copy, ExternalLink } from "lucide-react";

export function DashboardPackageRow({
	project,
	walletAddress,
	onUpdated,
}: {
	project: ProjectSummary;
	walletAddress: string;
	onUpdated: () => void;
}) {
	const [viewOpen, setViewOpen] = useState(false);

	return (
		<>
			<tr className="border-b last:border-0 transition-colors hover:bg-muted/20">
				<td className="px-4 py-3 font-medium">{project.name}</td>
				<td className="px-4 py-3 text-muted-foreground">
					{pricingModelLabel(project.pricingModel)}
				</td>
				<td className="px-4 py-3">{project.price ?? 0} USDC</td>
				<td className="px-4 py-3">
					<Badge variant="secondary" className="text-xs font-normal">
						Active
					</Badge>
				</td>
				<td className="px-4 py-3 text-right">
					<div className="flex items-center justify-end gap-2">
						{project.apiKeyValue ? (
							<CopyButton
								value={project.apiKeyValue}
								label="Copy API key"
								buttonText="Copy API key"
								variant="ghost"
								size="sm"
								className="h-8 text-muted-foreground hover:text-foreground"
							/>
						) : null}
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setViewOpen(true)}
							className="h-8 text-muted-foreground hover:text-foreground"
						>
							<ExternalLink className="size-3.5" />
							View project
						</Button>
					</div>
				</td>
			</tr>
			<Dialog open={viewOpen} onOpenChange={setViewOpen}>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{project.name}</DialogTitle>
					</DialogHeader>
					<DashboardPackageCard
						project={project}
						walletAddress={walletAddress}
						onUpdated={() => {
							onUpdated();
							setViewOpen(false);
						}}
						embedded
					/>
				</DialogContent>
			</Dialog>
		</>
	);
}
