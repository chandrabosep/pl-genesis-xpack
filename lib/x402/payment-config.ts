/** Default testnet facilitator (Base Sepolia + Solana devnet). */
export const X402_TEST_FACILITATOR_URL = "https://x402.org/facilitator";

/** Base Sepolia chain ID. */
export const BASE_SEPOLIA_CHAIN_ID = 84532;

/** Arc testnet chain ID (Circle L1). */
export const ARC_TESTNET_CHAIN_ID = 5042002;

/** Ethereum Sepolia chain ID. */
export const ETHEREUM_SEPOLIA_CHAIN_ID = 11155111;

/** Avalanche Fuji testnet chain ID. */
export const AVALANCHE_FUJI_CHAIN_ID = 43113;

/** World Chain Sepolia testnet chain ID. */
export const WORLD_CHAIN_SEPOLIA_CHAIN_ID = 4801;

/** Sonic Testnet chain ID. */
export const SONIC_TESTNET_CHAIN_ID = 64165;

/** Sei Atlantic (EVM) testnet chain ID. */
export const SEI_ATLANTIC_CHAIN_ID = 1329;

/** HyperEVM Testnet chain ID. */
export const HYPEREVM_TESTNET_CHAIN_ID = 998;

export type SupportedChainId =
	| typeof BASE_SEPOLIA_CHAIN_ID
	| typeof ARC_TESTNET_CHAIN_ID
	| typeof ETHEREUM_SEPOLIA_CHAIN_ID
	| typeof AVALANCHE_FUJI_CHAIN_ID
	| typeof WORLD_CHAIN_SEPOLIA_CHAIN_ID
	| typeof SONIC_TESTNET_CHAIN_ID
	| typeof SEI_ATLANTIC_CHAIN_ID
	| typeof HYPEREVM_TESTNET_CHAIN_ID;

export interface ChainConfig {
	chainId: number;
	name: string;
	rpcUrl: string;
	usdcAddress: string;
}

const BASE_SEPOLIA_RPC_DEFAULT = "https://sepolia.base.org";
const ARC_TESTNET_RPC_DEFAULT = "https://arc-testnet.drpc.org";
const ETHEREUM_SEPOLIA_RPC_DEFAULT = "https://rpc.sepolia.org";
const AVALANCHE_FUJI_RPC_DEFAULT = "https://api.avax-test.network/ext/bc/C/rpc";
const WORLD_CHAIN_SEPOLIA_RPC_DEFAULT = "https://worldchain-sepolia.g.alchemy.com/public";
const SONIC_TESTNET_RPC_DEFAULT = "https://testnet.soniclabs.com";
const SEI_ATLANTIC_RPC_DEFAULT = "https://evm.atlantic-2.seinetwork.io";
const HYPEREVM_TESTNET_RPC_DEFAULT = "https://testnet.rpc.hyperlane.xyz";

/** Supported payment chains: all Circle Gateway EVM testnets. */
export const SUPPORTED_CHAINS: ChainConfig[] = [
	{
		chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
		name: "Ethereum Sepolia",
		rpcUrl: process.env.ETHEREUM_SEPOLIA_RPC ?? process.env.NEXT_PUBLIC_ETHEREUM_SEPOLIA_RPC ?? ETHEREUM_SEPOLIA_RPC_DEFAULT,
		usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
	},
	{
		chainId: AVALANCHE_FUJI_CHAIN_ID,
		name: "Avalanche Fuji",
		rpcUrl: process.env.AVALANCHE_FUJI_RPC ?? process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC ?? AVALANCHE_FUJI_RPC_DEFAULT,
		usdcAddress: "0x5425890298aed601595a70AB815c96711a31Bc65",
	},
	{
		chainId: BASE_SEPOLIA_CHAIN_ID,
		name: "Base Sepolia",
		rpcUrl: process.env.RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL ?? BASE_SEPOLIA_RPC_DEFAULT,
		usdcAddress: process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS ?? "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
	},
	{
		chainId: SONIC_TESTNET_CHAIN_ID,
		name: "Sonic Testnet",
		rpcUrl: process.env.SONIC_TESTNET_RPC ?? process.env.NEXT_PUBLIC_SONIC_TESTNET_RPC ?? SONIC_TESTNET_RPC_DEFAULT,
		usdcAddress: "0x0BA304580ee7c9a980CF72e55f5Ed2E9fd30Bc51",
	},
	{
		chainId: WORLD_CHAIN_SEPOLIA_CHAIN_ID,
		name: "World Chain Sepolia",
		rpcUrl: process.env.WORLD_CHAIN_SEPOLIA_RPC ?? process.env.NEXT_PUBLIC_WORLD_CHAIN_SEPOLIA_RPC ?? WORLD_CHAIN_SEPOLIA_RPC_DEFAULT,
		usdcAddress: "0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88",
	},
	{
		chainId: SEI_ATLANTIC_CHAIN_ID,
		name: "Sei Atlantic",
		rpcUrl: process.env.SEI_ATLANTIC_RPC ?? process.env.NEXT_PUBLIC_SEI_ATLANTIC_RPC ?? SEI_ATLANTIC_RPC_DEFAULT,
		usdcAddress: "0x4fCF1784B31630811181f670Aea7A7bEF803eaED",
	},
	{
		chainId: HYPEREVM_TESTNET_CHAIN_ID,
		name: "HyperEVM Testnet",
		rpcUrl: process.env.HYPEREVM_TESTNET_RPC ?? process.env.NEXT_PUBLIC_HYPEREVM_TESTNET_RPC ?? HYPEREVM_TESTNET_RPC_DEFAULT,
		usdcAddress: "0x2B3370eE501B4a559b57D449569354196457D8Ab",
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
