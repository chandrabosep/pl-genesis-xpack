"use client";

import Link from "next/link";
import type { ProjectSummary } from "@/types/projects";
import { pricingModelLabel, shortenAddress, formatDate } from "@/lib/utils";
import { CopyButton } from "@/components/ui/copy-button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { FolderKanban, ChevronRight } from "lucide-react";

export function ProjectCard({ project }: { project: ProjectSummary }) {
	const subtitle = [
		pricingModelLabel(project.pricingModel),
		project.price != null ? `${project.price} ${project.receiveMode === "sui" ? "SUI" : project.receiveMode === "flow" ? "FLOW" : "USDC"}` : null,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<Link
			href={`/projects/${project.id}`}
			className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
		>
			<Card className="h-full transition-all duration-200 hover:border-purple-300/60 hover:shadow-md cursor-pointer border border-border/80 bg-card rounded-xl overflow-hidden">
				<CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
					<div className="flex min-w-0 flex-1 items-start gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
							<FolderKanban className="size-5" />
						</div>
						<div className="min-w-0 flex-1">
							<h3 className="truncate font-semibold text-foreground">
								{project.name}
							</h3>
							<p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
						</div>
					</div>
					<ChevronRight className="size-4 shrink-0 text-muted-foreground mt-1.5" />
				</CardHeader>
				<CardContent className="space-y-3 pt-0">
					<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
						<span>Created {formatDate(project.createdAt)}</span>
						<span className="font-mono">{shortenAddress(project.id, 8, 6)}</span>
					</div>
					{project.apiKeyValue ? (
						<div
							className="flex items-center gap-2 pt-1"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
							}}
						>
							<code className="flex-1 min-w-0 truncate rounded-md bg-muted/80 px-2 py-1 text-[11px] font-mono text-muted-foreground">
								{shortenAddress(project.apiKeyValue, 10, 6)}
							</code>
							<CopyButton
								value={project.apiKeyValue}
								label="Copy API key"
								buttonText="Copy"
								variant="outline"
								size="sm"
								className="shrink-0 h-7 text-xs"
							/>
						</div>
					) : null}
				</CardContent>
			</Card>
		</Link>
	);
}
