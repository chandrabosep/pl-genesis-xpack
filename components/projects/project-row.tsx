"use client";

import type { ProjectSummary } from "@/types/projects";
import { pricingModelLabel } from "@/lib/utils";
import { CopyButton } from "@/components/ui/copy-button";
import { Badge } from "@/components/ui/badge";
import { shortenAddress, formatDate } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProjectRow({ project }: { project: ProjectSummary }) {
	const router = useRouter();

	return (
		<tr
		  role="button"
		  tabIndex={0}
		  onClick={() => router.push(`/projects/${project.id}`)}
		  onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					router.push(`/projects/${project.id}`);
				}
			}}
		  className="border-b border-purple-200/20 last:border-0 transition-colors hover:bg-purple-50/50 cursor-pointer"
		>
			<td className="px-4 py-3">
				<div className="flex items-center gap-2">
					<span className="font-medium text-gray-900">{project.name}</span>
					<ChevronRight className="size-4 shrink-0 text-muted-foreground" />
				</div>
			</td>
			<td className="px-4 py-3">
				<Badge variant="secondary" className="text-xs">
					{pricingModelLabel(project.pricingModel)}
				</Badge>
			</td>
			<td className="px-4 py-3 text-gray-900">
				{project.price != null ? `${project.price} USDC` : "—"}
			</td>
			<td className="px-4 py-3 text-muted-foreground font-mono text-xs">
				{shortenAddress(project.paymentAddress)}
			</td>
			<td className="px-4 py-3 text-muted-foreground font-mono text-xs">
				{shortenAddress(project.id, 8, 6)}
			</td>
			<td className="px-4 py-3 text-muted-foreground text-xs">
				{formatDate(project.createdAt)}
			</td>
			<td className="px-4 py-3 text-right">
				{project.apiKeyValue ? (
					<div
						className="flex items-center justify-end gap-2"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
						}}
					>
						<code className="max-w-[100px] truncate rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">
							{shortenAddress(project.apiKeyValue, 10, 6)}
						</code>
						<CopyButton
							value={project.apiKeyValue}
							label="Copy API key"
							buttonText="Copy"
							variant="ghost"
							size="sm"
							className="h-8"
						/>
					</div>
				) : (
					<span className="text-xs text-muted-foreground">—</span>
				)}
			</td>
		</tr>
	);
}
