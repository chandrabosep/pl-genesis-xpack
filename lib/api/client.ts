import axios from "axios";

/**
 * Axios instance for app API calls. Use relative URLs so they work in browser.
 * Wallet address is passed per-request via headers in controller functions.
 */
export const apiClient = axios.create({
	baseURL: typeof window !== "undefined" ? "" : undefined,
	headers: {
		"Content-Type": "application/json",
	},
});

export function apiHeaders(walletAddress: string): Record<string, string> {
	return {
		"x-wallet-address": walletAddress,
	};
}
