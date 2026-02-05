/** Default testnet facilitator (Base Sepolia + Solana devnet). */
export const X402_TEST_FACILITATOR_URL = "https://x402.org/facilitator";

/** Base Sepolia chain ID. */
export const BASE_SEPOLIA_CHAIN_ID = 84532;

/** Arc testnet chain ID (Circle L1). */
export const ARC_TESTNET_CHAIN_ID = 5042002;

export type SupportedChainId = typeof BASE_SEPOLIA_CHAIN_ID | typeof ARC_TESTNET_CHAIN_ID;

export interface ChainConfig {
	chainId: number;
	name: string;
	rpcUrl: string;
	usdcAddress: string;
}

const BASE_SEPOLIA_RPC_DEFAULT = "https://sepolia.base.org";
const ARC_TESTNET_RPC_DEFAULT = "https://arc-testnet.drpc.org";

/** Supported payment chains: Base Sepolia and Arc testnet. */
export const SUPPORTED_CHAINS: ChainConfig[] = [
	{
		chainId: BASE_SEPOLIA_CHAIN_ID,
		name: "Base Sepolia",
		rpcUrl: process.env.RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL ?? BASE_SEPOLIA_RPC_DEFAULT,
		usdcAddress: process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS ?? "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
	},
	{
		chainId: ARC_TESTNET_CHAIN_ID,
		name: "Arc",
		rpcUrl: process.env.ARC_TESTNET_RPC ?? process.env.NEXT_PUBLIC_ARC_TESTNET_RPC ?? ARC_TESTNET_RPC_DEFAULT,
		usdcAddress: "0x3600000000000000000000000000000000000000",
	},
];

export function getChainConfig(chainId: number): ChainConfig | undefined {
	return SUPPORTED_CHAINS.find((c) => c.chainId === chainId);
}

export function isSupportedChain(chainId: number): boolean {
	return getChainConfig(chainId) != null;
}

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
	if (SUPPORTED_CHAINS.some((c) => c.chainId === BASE_SEPOLIA_CHAIN_ID)) {
		return X402_TEST_FACILITATOR_URL;
	}
	return undefined;
}

/** Chain ID for payment URIs when only one chain is used (legacy). Default Base Sepolia (84532). */
export function paymentChainId(): number {
	const raw = process.env.NEXT_PUBLIC_PAYMENT_CHAIN_ID ?? process.env.PAYMENT_CHAIN_ID;
	if (raw == null || raw === "") return BASE_SEPOLIA_CHAIN_ID;
	const n = Number(raw);
	return Number.isInteger(n) && n > 0 ? n : BASE_SEPOLIA_CHAIN_ID;
}

/** USDC on Base Sepolia (Circle test token). 6 decimals. */
export const BASE_SEPOLIA_USDC_ADDRESS =
	SUPPORTED_CHAINS.find((c) => c.chainId === BASE_SEPOLIA_CHAIN_ID)?.usdcAddress ??
	process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS ??
	"0x036CbD53842c5426634e7929541eC2318f3dCF7e";

/** Token decimals for payment (USDC = 6). */
export const PAYMENT_TOKEN_DECIMALS = 6;

/** Token symbol for display. */
export const PAYMENT_TOKEN_SYMBOL = "USDC";

/**
 * RPC URL for the given chain (for on-chain verification).
 */
export function getRpcUrl(chainId: number): string {
	const config = getChainConfig(chainId);
	if (config) return config.rpcUrl;
	const env = process.env.RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL;
	if (env && typeof env === "string" && env.trim().length > 0) return env.trim();
	return SUPPORTED_CHAINS[0]?.rpcUrl ?? "https://sepolia.base.org";
}

/** Get USDC token address for a chain. */
export function getUsdcAddress(chainId: number): string | undefined {
	return getChainConfig(chainId)?.usdcAddress;
}
