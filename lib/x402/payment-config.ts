/** Default testnet facilitator (Base Sepolia + Solana devnet). */
export const X402_TEST_FACILITATOR_URL = "https://x402.org/facilitator";

/**
 * x402 payment facilitator URL from env, or default for testnet.
 * Used for on-chain payment verification (e.g. transaction hash).
 * For testing use https://x402.org/facilitator (Base Sepolia + Solana devnet).
 */
export function facilitatorUrl(): string | undefined {
	const url = process.env.X402_FACILITATOR_URL;
	if (url && typeof url === "string") {
		const trimmed = url.trim();
		if (trimmed.length > 0) return trimmed.replace(/\/$/, "");
	}
	// Default to x402.org facilitator on Base Sepolia so testnet payments are verified
	if (paymentChainId() === BASE_SEPOLIA_CHAIN_ID) {
		return X402_TEST_FACILITATOR_URL;
	}
	return undefined;
}

/** Base Sepolia chain ID. */
export const BASE_SEPOLIA_CHAIN_ID = 84532;

/** Chain ID for payment URIs (EIP-681). Default Base Sepolia (84532). */
export function paymentChainId(): number {
	const raw = process.env.NEXT_PUBLIC_PAYMENT_CHAIN_ID ?? process.env.PAYMENT_CHAIN_ID;
	if (raw == null || raw === "") return BASE_SEPOLIA_CHAIN_ID;
	const n = Number(raw);
	return Number.isInteger(n) && n > 0 ? n : BASE_SEPOLIA_CHAIN_ID;
}

/** USDC on Base Sepolia (Circle test token). 6 decimals. */
export const BASE_SEPOLIA_USDC_ADDRESS =
	process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS ?? "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

/** Token decimals for payment (USDC = 6). */
export const PAYMENT_TOKEN_DECIMALS = 6;

/** Token symbol for display. */
export const PAYMENT_TOKEN_SYMBOL = "USDC";

/** Default Base Sepolia public RPC. */
const BASE_SEPOLIA_RPC = "https://sepolia.base.org";

/**
 * RPC URL for the given chain (for on-chain verification).
 * Uses RPC_URL or NEXT_PUBLIC_RPC_URL if set, else default for Base Sepolia.
 */
export function getRpcUrl(chainId: number): string {
	const env =
		process.env.RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL;
	if (env && typeof env === "string" && env.trim().length > 0) {
		return env.trim();
	}
	if (chainId === BASE_SEPOLIA_CHAIN_ID) {
		return BASE_SEPOLIA_RPC;
	}
	return BASE_SEPOLIA_RPC; // fallback
}
