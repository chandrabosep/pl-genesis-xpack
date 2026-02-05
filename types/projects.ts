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
}
