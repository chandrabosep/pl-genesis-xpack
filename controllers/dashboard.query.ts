"use client";

import {
	useQuery,
	type UseQueryOptions,
	type QueryKey,
} from "@tanstack/react-query";
import { apiClient, apiHeaders } from "@/lib/api/client";
import { queryKeys } from "@/query-keys/query-keys";

export type DashboardStats = {
	activeProjects: number;
	installs: number;
	totalPayments: number;
};

export type DashboardStatsFilters = {
	projectId?: string;
	dateFrom?: string;
	dateTo?: string;
};

async function fetchDashboardStats(
	walletAddress: string,
	filters?: DashboardStatsFilters
): Promise<DashboardStats> {
	const params = new URLSearchParams();
	if (filters?.projectId) params.set("projectId", filters.projectId);
	if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
	if (filters?.dateTo) params.set("dateTo", filters.dateTo);
	const { data } = await apiClient.get<DashboardStats>(
		`/api/dashboard/stats?${params}`,
		{ headers: apiHeaders(walletAddress) }
	);
	return data;
}

export function useDashboardStatsQuery(
	walletAddress: string | undefined,
	filters?: DashboardStatsFilters,
	options?: Omit<
		UseQueryOptions<DashboardStats, Error, DashboardStats, QueryKey>,
		"queryKey" | "queryFn"
	>
) {
	return useQuery({
		queryKey: queryKeys.dashboard.stats(walletAddress ?? "", filters),
		queryFn: () => fetchDashboardStats(walletAddress!, filters),
		enabled: Boolean(walletAddress),
		...options,
	});
}
