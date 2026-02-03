/**
 * Centralized TanStack Query keys for cache consistency and invalidation.
 */

export const queryKeys = {
	projects: {
		all: ["projects"] as const,
		list: (walletAddress: string) =>
			["projects", "list", walletAddress] as const,
		detail: (walletAddress: string, projectId: string) =>
			["projects", "detail", walletAddress, projectId] as const,
	},
	dashboard: {
		stats: (
			walletAddress: string,
			filters?: { projectId?: string; dateFrom?: string; dateTo?: string }
		) =>
			["dashboard", "stats", walletAddress, filters ?? {}] as const,
	},
	logs: {
		all: (walletAddress: string) => ["logs", walletAddress] as const,
		list: (
			walletAddress: string,
			filters?: { projectId?: string; limit?: number }
		) => ["logs", walletAddress, filters ?? {}] as const,
	},
} as const;
