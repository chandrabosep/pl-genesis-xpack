import type { PricingModel } from "./constants";

export interface ProjectSummary {
	id: string;
	name: string;
	pricingModel: PricingModel;
	paymentAddress: string;
	price: number | null;
	apiKeyValue: string | null;
	createdAt: string;
	receiveMode?: string | null;
	unifiedReceiveAddress?: string | null;
	/** Optional Sui address to receive SUI payments (Sui hackathon / ecosystem). */
	suiAddress?: string | null;
	/** Optional Starknet address to receive USDC on Starknet Sepolia. */
	starknetAddress?: string | null;
}
