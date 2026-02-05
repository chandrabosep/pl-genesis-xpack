"use client";

import { useState, useEffect } from "react";
import { useWalletAddress } from "@/lib/auth/use-wallet-address";
import type { ProjectSummary } from "@/types/projects";
import { CreatePackageButton } from "@/components/projects/create-package-button";
import { DashboardPackageRow } from "@/components/projects/dashboard-package-row";
import { useProjectsQuery } from "@/controllers/projects.query";
import { useDashboardStatsQuery } from "@/controllers/dashboard.query";
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
	Package,
	FolderKanban,
	Download,
	DollarSign,
	Wallet,
} from "lucide-react";

export default function DashboardPage() {
	const walletAddress = useWalletAddress();
	const [filterProjectId, setFilterProjectId] = useState<string>("");
	const [filterDateFrom, setFilterDateFrom] = useState<string>("");
	const [filterDateTo, setFilterDateTo] = useState<string>("");
	const [circleWalletsCount, setCircleWalletsCount] = useState<number | null>(null);
	useEffect(() => {
		fetch("/api/circle/wallets/balances?blockchain=BASE-SEPOLIA")
			.then((r) => (r.ok ? r.json() : null))
			.then((data: { wallets?: unknown[] } | null) =>
				setCircleWalletsCount(data?.wallets?.length ?? null),
			)
			.catch(() => setCircleWalletsCount(null));
	}, []);

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
		<main className="space-y-8 p-6">
			<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Dashboard
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						How is my monetization doing at a glance?
					</p>
				</div>
				<CreatePackageButton
					walletAddress={walletAddress}
					onCreated={onUpdated}
				/>
			</header>

			<section className="grid gap-4 sm:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Active projects
						</CardTitle>
						<FolderKanban className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						{statsLoading ? (
							<div className="h-8 w-20 animate-pulse rounded bg-muted" />
						) : (
							<span className="text-2xl font-semibold">
								{stats?.activeProjects ?? 0}
							</span>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Successful installs
						</CardTitle>
						<Download className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						{statsLoading ? (
							<div className="h-8 w-20 animate-pulse rounded bg-muted" />
						) : (
							<span className="text-2xl font-semibold">
								{stats?.installs ?? 0}
							</span>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Total revenue
						</CardTitle>
						<DollarSign className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						{statsLoading ? (
							<div className="h-8 w-20 animate-pulse rounded bg-muted" />
						) : (
							<span className="text-2xl font-semibold">
								{(stats?.totalPayments ?? 0).toLocaleString()} USDC
							</span>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Circle Wallets
						</CardTitle>
						<Wallet className="size-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						{circleWalletsCount === null ? (
							<span className="text-sm text-muted-foreground">
								—
							</span>
						) : (
							<span className="text-2xl font-semibold">
								{circleWalletsCount} wallet{circleWalletsCount !== 1 ? "s" : ""}
							</span>
						)}
						<p className="mt-1 text-xs text-muted-foreground">
							Programmable Wallets (API)
						</p>
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
						className="h-8 w-[160px] border-muted-foreground/20"
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
				<span className="text-muted-foreground/50">|</span>
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
						className="text-xs text-muted-foreground transition-colors hover:text-foreground"
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
				<h2 className="mb-3 text-sm font-medium text-muted-foreground">
					Packages
				</h2>
				{loading ? (
					<div className="flex items-center justify-center rounded-lg border border-border p-4">
						<div className="flex w-full flex-col gap-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<div
									key={i}
									className="flex animate-pulse items-center gap-4 border-b px-4 py-3 last:border-b-0"
								>
									<div className="h-8 w-8 rounded bg-muted" />
									<div className="flex-1">
										<div className="mb-2 h-4 w-1/3 rounded bg-muted" />
										<div className="h-3 w-1/4 rounded bg-muted" />
									</div>
									<div className="h-6 w-16 rounded bg-muted" />
									<div className="h-6 w-12 rounded bg-muted" />
									<div className="ml-auto h-6 w-20 rounded bg-muted" />
								</div>
							))}
						</div>
					</div>
				) : projects.length === 0 ? (
					<div className="rounded-lg border border-dashed bg-muted/30 py-16 text-center">
						<Package className="mx-auto size-10 text-muted-foreground/70" />
						<p className="mt-3 text-sm font-medium text-muted-foreground">
							No packages yet
						</p>
						<p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
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
					<Card>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-muted/30">
										<th className="px-4 py-3 text-left font-medium">
											Package name
										</th>
										<th className="px-4 py-3 text-left font-medium">
											Pricing model
										</th>
										<th className="px-4 py-3 text-left font-medium">
											Price
										</th>
										<th className="px-4 py-3 text-left font-medium">
											Status
										</th>
										<th className="px-4 py-3 text-right font-medium">
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
