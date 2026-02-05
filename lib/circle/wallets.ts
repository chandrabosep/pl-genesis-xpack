/**
 * Circle Programmable Wallets (developer-controlled) API client.
 * Used to list wallets and balances (bounty: "Circle Wallets" requirement).
 * @see https://developers.circle.com/api-reference/wallets/developer-controlled-wallets
 */

const CIRCLE_API_BASE =
	process.env.CIRCLE_API_URL ?? "https://api.circle.com";

export type CircleWalletBalance = {
	id: string;
	address: string;
	blockchain: string;
	tokenBalances?: Array<{
		amount: string;
		token?: { symbol?: string; decimals?: number; tokenAddress?: string };
	}>;
	state?: string;
};

/**
 * List developer-controlled wallets with balances.
 * Requires CIRCLE_API_KEY (Bearer). Optional blockchain filter (e.g. BASE-SEPOLIA, ARC-TESTNET).
 */
export async function listWalletsWithBalances(params?: {
	blockchain?: string;
	walletSetId?: string;
	pageSize?: number;
}): Promise<{ wallets: CircleWalletBalance[] }> {
	const apiKey = process.env.CIRCLE_API_KEY;
	if (!apiKey?.trim()) {
		throw new Error("CIRCLE_API_KEY is not set");
	}

	const searchParams = new URLSearchParams();
	// Circle API often requires blockchain filter for this endpoint
	const blockchain = params?.blockchain ?? "BASE-SEPOLIA";
	searchParams.set("blockchain", blockchain);
	if (params?.walletSetId) searchParams.set("walletSetId", params.walletSetId);
	if (params?.pageSize != null) searchParams.set("pageSize", String(params.pageSize));

	const url = `${CIRCLE_API_BASE}/v1/w3s/developer/wallets/balances?${searchParams}`;
	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${apiKey.trim()}`,
			"Content-Type": "application/json",
		},
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Circle Wallets API error: ${res.status} ${text}`);
	}

	const json = (await res.json()) as { data?: { wallets?: CircleWalletBalance[] } };
	return {
		wallets: json.data?.wallets ?? [],
	};
}
