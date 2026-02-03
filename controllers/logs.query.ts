"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { apiClient, apiHeaders } from "@/lib/api/client";
import { queryKeys } from "@/query-keys/query-keys";
import type { InstallLogEntry } from "@/types/logs";

export type LogsPage = {
	logs: InstallLogEntry[];
	nextCursor: string | null;
};

export type LogsFilters = {
	projectId?: string;
	limit?: number;
};

async function fetchLogsPage(
	walletAddress: string,
	filters: LogsFilters,
	cursor?: string
): Promise<LogsPage> {
	const params = new URLSearchParams();
	if (filters.projectId) params.set("projectId", filters.projectId);
	if (cursor) params.set("cursor", cursor);
	params.set("limit", String(filters.limit ?? 30));
	const { data } = await apiClient.get<LogsPage>(
		`/api/logs?${params}`,
		{ headers: apiHeaders(walletAddress) }
	);
	return data;
}

export function useLogsInfiniteQuery(
	walletAddress: string | undefined,
	filters?: LogsFilters
) {
	const limit = filters?.limit ?? 30;
	return useInfiniteQuery({
		queryKey: queryKeys.logs.list(walletAddress ?? "", {
			projectId: filters?.projectId,
			limit,
		}),
		queryFn: ({ pageParam }) =>
			fetchLogsPage(walletAddress!, { ...filters, limit }, pageParam as string | undefined),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) =>
			lastPage.nextCursor ? lastPage.nextCursor : undefined,
		enabled: Boolean(walletAddress),
	});
}
