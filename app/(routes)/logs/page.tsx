"use client";

import { useWalletAddress } from "@/lib/auth/use-wallet-address";
import type { ProjectSummary } from "@/types/projects";
import type { InstallLogEntry } from "@/types/logs";
import { EVENT_TYPE_LABELS } from "@/types/logs";
import { useProjectsQuery } from "@/controllers/projects.query";
import { useLogsInfiniteQuery } from "@/controllers/logs.query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Package, ScrollText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

export default function LogsPage() {
	const walletAddress = useWalletAddress();
	const [projectId, setProjectId] = useState<string>("");

	const { data: projectsData } = useProjectsQuery(walletAddress ?? undefined);
	const projects: ProjectSummary[] = projectsData?.projects ?? [];

	const {
		data,
		isLoading: loading,
		error: logsError,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useLogsInfiniteQuery(walletAddress ?? undefined, {
		projectId: projectId || undefined,
		limit: 30,
	});

	const pages = data?.pages ?? [];
	const logs: InstallLogEntry[] = pages.flatMap((p) => p.logs);
	const error = logsError?.message ?? null;

	if (!walletAddress) {
		return (
			<main className="min-h-[60vh] flex flex-col items-center justify-center px-6">
				<div className="text-center max-w-md space-y-4">
					<div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
						<ScrollText className="size-6 text-muted-foreground" />
					</div>
					<h1 className="text-xl font-semibold">Logs</h1>
					<p className="text-sm text-muted-foreground">
						Connect your wallet to view install and payment logs.
					</p>
				</div>
			</main>
		);
	}

	return (
		<main className="p-6 space-y-6">
			<header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Install attempts and payment events across your projects
					</p>
				</div>
			</header>

			<section className="flex flex-wrap items-center gap-3 py-2">
				<Select
					value={projectId || "all"}
					onValueChange={(v) => setProjectId(v === "all" ? "" : v)}
				>
					<SelectTrigger
						id="filter-project"
						className="h-9 w-[180px] border-muted-foreground/20"
					>
						<SelectValue placeholder="All projects" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All projects</SelectItem>
						{projects.map((p) => (
							<SelectItem key={p.id} value={p.id}>
								{p.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</section>

			{error ? (
				<div
					className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
					data-testid="logs-error"
				>
					{error}
				</div>
			) : null}

			<Card>
				<div className="overflow-x-auto">
					{loading ? (
						<div className="flex items-center justify-center py-16">
							<Loader2 className="size-8 animate-spin text-muted-foreground" />
						</div>
					) : logs.length === 0 ? (
						<div className="py-16 text-center">
							<Package className="mx-auto size-10 text-muted-foreground/70" />
							<p className="mt-3 text-sm font-medium text-muted-foreground">
								No logs yet
							</p>
							<p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
								Install attempts and payment events will appear here once
								developers start using your packages.
							</p>
						</div>
					) : (
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b bg-muted/30">
									<th className="text-left font-medium py-3 px-4">Time</th>
									<th className="text-left font-medium py-3 px-4">Project</th>
									<th className="text-left font-medium py-3 px-4">Event</th>
									<th className="text-left font-medium py-3 px-4">Status</th>
									<th className="text-right font-medium py-3 px-4">Amount</th>
								</tr>
							</thead>
							<tbody>
								{logs.map((log) => (
									<tr
										key={log.id}
										className="border-b last:border-0 hover:bg-muted/20 transition-colors"
									>
										<td className="py-3 px-4 text-muted-foreground tabular-nums">
											{format(new Date(log.timestamp), "MMM d, yyyy HH:mm:ss")}
										</td>
										<td className="py-3 px-4 font-medium">{log.packageName}</td>
										<td className="py-3 px-4">
											{EVENT_TYPE_LABELS[log.eventType]}
										</td>
										<td className="py-3 px-4">
											<Badge
												variant={log.status === "success" ? "default" : "secondary"}
												className="text-xs font-normal"
											>
												{log.status}
											</Badge>
										</td>
										<td className="py-3 px-4 text-right">
											{log.amount != null ? `${log.amount} USDC` : "—"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
				{hasNextPage && logs.length > 0 ? (
					<div className="border-t px-4 py-3 flex justify-center">
						<Button
							variant="outline"
							size="sm"
							onClick={() => fetchNextPage()}
							disabled={isFetchingNextPage}
						>
							{isFetchingNextPage ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Loading…
								</>
							) : (
								"Load more"
							)}
						</Button>
					</div>
				) : null}
			</Card>
		</main>
	);
}
