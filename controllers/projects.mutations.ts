"use client";

/**
 * Project mutations. Each mutation's onSuccess invalidates the relevant
 * query keys; TanStack Query then refetches any active (mounted) queries,
 * so lists and detail stay in sync when you add, update, rotate, or delete.
 */
import {
	useMutation,
	useQueryClient,
	type UseMutationOptions,
} from "@tanstack/react-query";
import { apiClient, apiHeaders } from "@/lib/api/client";
import { queryKeys } from "@/query-keys/query-keys";
import type { ProjectSummary } from "@/types/projects";
import type {
	ProjectCreateInput,
	ProjectUpdateInput,
	ProjectRotateInput,
} from "@/types/schemas";

async function createProject(
	walletAddress: string,
	input: ProjectCreateInput
): Promise<ProjectSummary> {
	const { data } = await apiClient.post<ProjectSummary>("/api/projects", input, {
		headers: apiHeaders(walletAddress),
	});
	return data;
}

async function updateProject(
	walletAddress: string,
	input: ProjectUpdateInput
): Promise<ProjectSummary> {
	const { data } = await apiClient.patch<ProjectSummary>(
		"/api/projects",
		input,
		{ headers: apiHeaders(walletAddress) }
	);
	return data;
}

async function rotateProjectKey(
	walletAddress: string,
	input: ProjectRotateInput
): Promise<{ id: string; value: string }> {
	const { data } = await apiClient.patch<{ id: string; value: string }>(
		"/api/projects",
		input,
		{ headers: apiHeaders(walletAddress) }
	);
	return data;
}

async function deleteProject(
	walletAddress: string,
	projectId: string
): Promise<unknown> {
	const { data } = await apiClient.delete(
		`/api/projects?projectId=${encodeURIComponent(projectId)}`,
		{ headers: apiHeaders(walletAddress) }
	);
	return data;
}

export function useCreateProjectMutation(
	walletAddress: string | undefined,
	options?: UseMutationOptions<
		ProjectSummary,
		Error,
		ProjectCreateInput,
		unknown
	>
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: ProjectCreateInput) =>
			createProject(walletAddress!, input),
		onSuccess: (_, __, ctx) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
			queryClient.invalidateQueries({
				queryKey: queryKeys.dashboard.stats(walletAddress ?? ""),
			});
		},
		...options,
	});
}

export function useUpdateProjectMutation(
	walletAddress: string | undefined,
	options?: UseMutationOptions<
		ProjectSummary,
		Error,
		ProjectUpdateInput,
		unknown
	>
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: ProjectUpdateInput) =>
			updateProject(walletAddress!, input),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
			queryClient.invalidateQueries({
				queryKey: queryKeys.projects.detail(
					walletAddress ?? "",
					variables.projectId
				),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.dashboard.stats(walletAddress ?? ""),
			});
		},
		...options,
	});
}

export function useRotateProjectKeyMutation(
	walletAddress: string | undefined,
	options?: UseMutationOptions<
		{ id: string; value: string },
		Error,
		ProjectRotateInput,
		unknown
	>
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: ProjectRotateInput) =>
			rotateProjectKey(walletAddress!, input),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
			queryClient.invalidateQueries({
				queryKey: queryKeys.projects.detail(
					walletAddress ?? "",
					variables.projectId
				),
			});
		},
		...options,
	});
}

export function useDeleteProjectMutation(
	walletAddress: string | undefined,
	options?: UseMutationOptions<unknown, Error, string, unknown>
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (projectId: string) =>
			deleteProject(walletAddress!, projectId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
			queryClient.invalidateQueries({
				queryKey: queryKeys.dashboard.stats(walletAddress ?? ""),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.logs.all(walletAddress ?? ""),
			});
		},
		...options,
	});
}
