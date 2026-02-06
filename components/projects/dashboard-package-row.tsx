"use client";

import type { ProjectSummary } from "@/types/projects";
import { pricingModelLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

export function DashboardPackageRow({
	project,
	walletAddress,
	onUpdated,
}: {
	project: ProjectSummary;
	walletAddress: string;
	onUpdated: () => void;
}) {
	const router = useRouter();

	return (
		<>
			<tr className="border-b border-purple-200/20 last:border-0 transition-colors hover:bg-purple-50/50">
				<td className="px-4 py-3 font-medium text-gray-900">{project.name}</td>
				<td className="px-4 py-3 text-gray-600">
					{pricingModelLabel(project.pricingModel)}
				</td>
				<td className="px-4 py-3 text-gray-900">{project.price ?? 0} USDC</td>
				<td className="px-4 py-3">
					<span className="inline-flex items-center rounded-full border border-purple-200/50 bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
						Active
					</span>
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
								className="h-8 text-gray-600 hover:text-purple-600"
							/>
						) : null}
						<Button
							variant="ghost"
							size="sm"
							onClick={() => router.push(`/projects/${project.id}`)}
							className="h-8 text-gray-600 hover:text-purple-600"
						>
							<ExternalLink className="size-3.5" />
							View project
						</Button>
					</div>
				</td>
			</tr>
		</>
	);
}
