"use client";

import axios from "axios";
import {
	useQuery,
	type UseQueryOptions,
	type QueryKey,
} from "@tanstack/react-query";
import { apiClient, apiHeaders } from "@/lib/api/client";
import { queryKeys } from "@/query-keys/query-keys";
import type { ProjectSummary } from "@/types/projects";

export type ProjectsListResponse = { projects: ProjectSummary[] };

async function fetchProjects(
	walletAddress: string
): Promise<ProjectsListResponse> {
	const { data } = await apiClient.get<ProjectsListResponse>("/api/projects", {
		headers: apiHeaders(walletAddress),
	});
	return data;
}

async function fetchProjectById(
	walletAddress: string,
	projectId: string
): Promise<ProjectSummary> {
	const { data } = await apiClient.get<ProjectSummary>(
		`/api/projects/${projectId}`,
		{ headers: apiHeaders(walletAddress) }
	);
	return data;
}

export function useProjectsQuery(
	walletAddress: string | undefined,
	options?: Omit<
		UseQueryOptions<ProjectsListResponse, Error, ProjectsListResponse, QueryKey>,
		"queryKey" | "queryFn"
	>
) {
	return useQuery({
		queryKey: queryKeys.projects.list(walletAddress ?? ""),
		queryFn: () => fetchProjects(walletAddress!),
		enabled: Boolean(walletAddress),
		...options,
	});
}

export function useProjectByIdQuery(
	walletAddress: string | undefined,
	projectId: string | undefined,
	options?: Omit<
		UseQueryOptions<ProjectSummary | null, Error, ProjectSummary | null, QueryKey>,
		"queryKey" | "queryFn"
	>
) {
	return useQuery({
		queryKey: queryKeys.projects.detail(walletAddress ?? "", projectId ?? ""),
		queryFn: async () => {
			if (!walletAddress || !projectId) return null;
			try {
				return await fetchProjectById(walletAddress, projectId);
			} catch (err) {
				if (axios.isAxiosError(err) && err.response?.status === 404) {
					return null;
				}
				throw err;
			}
		},
		enabled: Boolean(walletAddress && projectId),
		...options,
	});
}
