export type PricingModel =
	| "one_time"
	| "subscription"
	| "per_device"
	| "per_version";

/** x402 HTTP headers for payment-required responses */
export const X402_HEADERS = {
	price: "X-Payment-Price",
	address: "X-Payment-Address",
	session: "X-Payment-Session",
	instructions: "X-Payment-Instructions",
} as const;
