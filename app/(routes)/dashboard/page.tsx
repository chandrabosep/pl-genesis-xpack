"use client";

import { useState } from "react";
import { useWalletAddress } from "@/lib/auth/use-wallet-address";
import type { ProjectSummary } from "@/types/projects";
import { CreatePackageButton } from "@/components/projects/create-package-button";
import { DashboardPackageRow } from "@/components/projects/dashboard-package-row";
import { useProjectsQuery } from "@/controllers/projects.query";
import { useDashboardStatsQuery } from "@/controllers/dashboard.query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Package, FolderKanban, Download, DollarSign } from "lucide-react";

export default function DashboardPage() {
	const walletAddress = useWalletAddress();
	const [filterProjectId, setFilterProjectId] = useState<string>("");
	const [filterDateFrom, setFilterDateFrom] = useState<string>("");
	const [filterDateTo, setFilterDateTo] = useState<string>("");

	const {
		data: projectsData,
		isLoading: loading,
		error: projectsError,
		refetch: refetchProjects,
	} = useProjectsQuery(walletAddress ?? undefined);

	const {
		data: stats,
		isLoading: statsLoading,
		refetch: refetchStats,
	} = useDashboardStatsQuery(walletAddress ?? undefined, {
		projectId: filterProjectId || undefined,
		dateFrom: filterDateFrom || undefined,
		dateTo: filterDateTo || undefined,
	});

	const projects: ProjectSummary[] = projectsData?.projects ?? [];
	const error = projectsError?.message ?? null;

	const clearFilters = () => {
		setFilterProjectId("");
		setFilterDateFrom("");
		setFilterDateTo("");
	};

	const hasActiveFilters = filterProjectId || filterDateFrom || filterDateTo;

	const onUpdated = () => {
		refetchProjects();
		refetchStats();
	};

	if (!walletAddress) {
		return (
			<main className="flex min-h-[60vh] flex-col items-center justify-center px-6">
				<div className="max-w-md space-y-4 text-center">
					<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
						<Package className="size-6 text-muted-foreground" />
					</div>
					<h1 className="text-xl font-semibold">Dashboard</h1>
					<p className="text-sm text-muted-foreground">
						Connect your wallet to view analytics and manage your
						packages.
					</p>
				</div>
			</main>
		);
	}

	return (
		<main className="space-y-8 p-6 bg-linear-to-b from-white to-purple-50/30 min-h-full">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-gray-900">
						Dashboard
					</h1>
					<p className="mt-1 text-sm text-gray-600">
						How is my monetization doing at a glance?
					</p>
				</div>
				<CreatePackageButton
					walletAddress={walletAddress}
					onCreated={onUpdated}
				/>
			</header>

			<section className="grid gap-4 sm:grid-cols-3">
				<Card className="ring-0 border border-purple-200/40 rounded-xl shadow-sm">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-gray-600">
							Active projects
						</CardTitle>
						<FolderKanban className="size-4 text-purple-600/80" />
					</CardHeader>
					<CardContent>
						{statsLoading ? (
							<div className="h-8 w-20 animate-pulse rounded bg-purple-50" />
						) : (
							<span className="text-2xl font-semibold text-purple-600">
								{stats?.activeProjects ?? 0}
							</span>
						)}
					</CardContent>
				</Card>
				<Card className="ring-0 border border-purple-200/40 rounded-xl shadow-sm">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-gray-600">
							Successful installs
						</CardTitle>
						<Download className="size-4 text-purple-600/80" />
					</CardHeader>
					<CardContent>
						{statsLoading ? (
							<div className="h-8 w-20 animate-pulse rounded bg-purple-50" />
						) : (
							<span className="text-2xl font-semibold text-purple-600">
								{stats?.installs ?? 0}
							</span>
						)}
					</CardContent>
				</Card>
				<Card className="ring-0 border border-purple-200/40 rounded-xl shadow-sm">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-gray-600">
							Total revenue
						</CardTitle>
						<DollarSign className="size-4 text-purple-600/80" />
					</CardHeader>
					<CardContent>
						{statsLoading ? (
							<div className="h-8 w-20 animate-pulse rounded bg-purple-50" />
						) : (
							<span className="text-2xl font-semibold text-purple-600">
								{(stats?.totalPayments ?? 0).toLocaleString()}{" "}
								USDC
							</span>
						)}
					</CardContent>
				</Card>
			</section>

			<section className="flex flex-wrap items-center gap-3 py-2">
				<Select
					value={filterProjectId || "all"}
					onValueChange={(v) =>
						setFilterProjectId(v === "all" ? "" : v)
					}
				>
					<SelectTrigger
						id="filter-project"
						className="h-8 w-[160px] border border-purple-200/40 bg-white rounded-lg"
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
				<span className="text-gray-300">|</span>
				<DateRangePicker
					dateFrom={filterDateFrom}
					dateTo={filterDateTo}
					onRangeChange={(from, to) => {
						setFilterDateFrom(from);
						setFilterDateTo(to);
					}}
					placeholder="dd/mm/yyyy"
				/>
				{hasActiveFilters ? (
					<button
						type="button"
						onClick={clearFilters}
						className="text-xs text-gray-500 transition-colors hover:text-purple-600"
					>
						Clear
					</button>
				) : null}
			</section>

			{error ? (
				<div
					className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
					data-testid="dashboard-error"
				>
					{error}
				</div>
			) : null}

			<section>
				<h2 className="mb-3 text-sm font-medium text-gray-700">
					Packages
				</h2>
				{loading ? (
					<div className="flex items-center justify-center rounded-xl border border-purple-200/40 bg-white p-4 shadow-sm">
						<div className="flex w-full flex-col gap-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<div
									key={i}
									className="flex animate-pulse items-center gap-4 border-b border-purple-200/20 px-4 py-3 last:border-b-0"
								>
									<div className="h-8 w-8 rounded bg-purple-50" />
									<div className="flex-1">
										<div className="mb-2 h-4 w-1/3 rounded bg-purple-50" />
										<div className="h-3 w-1/4 rounded bg-purple-50/70" />
									</div>
									<div className="h-6 w-16 rounded bg-purple-50" />
									<div className="h-6 w-12 rounded bg-purple-50" />
									<div className="ml-auto h-6 w-20 rounded bg-purple-50" />
								</div>
							))}
						</div>
					</div>
				) : projects.length === 0 ? (
					<div className="rounded-xl border border-dashed border-purple-200/40 bg-purple-50/50 py-16 text-center shadow-sm">
						<Package className="mx-auto size-10 text-purple-600/60" />
						<p className="mt-3 text-sm font-medium text-gray-700">
							No packages yet
						</p>
						<p className="mx-auto mt-1 max-w-xs text-xs text-gray-600">
							Create your first package to get an API key and
							start integrating.
						</p>
						<CreatePackageButton
							walletAddress={walletAddress}
							onCreated={onUpdated}
							variant="inline"
						/>
					</div>
				) : (
					<Card className="ring-0 border border-purple-200/40 overflow-hidden p-0 rounded-xl shadow-sm">
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-purple-200/30 bg-purple-50">
										<th className="px-4 py-3 text-left font-medium text-gray-900">
											Package name
										</th>
										<th className="px-4 py-3 text-left font-medium text-gray-900">
											Payment type
										</th>
										<th className="px-4 py-3 text-left font-medium text-gray-900">
											Pricing model
										</th>
										<th className="px-4 py-3 text-left font-medium text-gray-900">
											Price
										</th>
										<th className="px-4 py-3 text-left font-medium text-gray-900">
											Status
										</th>
										<th className="px-4 py-3 text-right font-medium text-gray-900">
											Quick actions
										</th>
									</tr>
								</thead>
								<tbody>
									{projects.map((project) => (
										<DashboardPackageRow
											key={project.id}
											project={project}
											walletAddress={walletAddress}
											onUpdated={onUpdated}
										/>
									))}
								</tbody>
							</table>
						</div>
					</Card>
				)}
			</section>
		</main>
	);
}
