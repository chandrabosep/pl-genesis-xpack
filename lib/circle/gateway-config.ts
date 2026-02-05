/**
 * Circle Gateway: testnet contract addresses and domain IDs.
 * Used for chain-abstracted USDC (e.g. pay on Base → receive on Arc).
 * @see https://developers.circle.com/gateway/references/contract-addresses
 */

import type { Address } from "viem";
import {
	BASE_SEPOLIA_CHAIN_ID,
	ARC_TESTNET_CHAIN_ID,
	ETHEREUM_SEPOLIA_CHAIN_ID,
	AVALANCHE_FUJI_CHAIN_ID,
	WORLD_CHAIN_SEPOLIA_CHAIN_ID,
	SONIC_TESTNET_CHAIN_ID,
	SEI_ATLANTIC_CHAIN_ID,
	HYPEREVM_TESTNET_CHAIN_ID,
} from "@/lib/x402/payment-config";

export const GATEWAY_WALLET_ADDRESS: Address =
	"0x0077777d7EBA4688BDeF3E311b846F25870A19B9";
export const GATEWAY_MINTER_ADDRESS: Address =
	"0x0022222ABE238Cc2C7Bb1f21003F0a260052475B";

/** Circle domain IDs for Gateway (testnet). @see https://developers.circle.com/gateway/references/supported-blockchains */
export const GATEWAY_DOMAIN_IDS = {
	[ETHEREUM_SEPOLIA_CHAIN_ID]: 0,
	[AVALANCHE_FUJI_CHAIN_ID]: 1,
	[BASE_SEPOLIA_CHAIN_ID]: 6,
	[SONIC_TESTNET_CHAIN_ID]: 13,
	[WORLD_CHAIN_SEPOLIA_CHAIN_ID]: 14,
	[SEI_ATLANTIC_CHAIN_ID]: 16,
	[HYPEREVM_TESTNET_CHAIN_ID]: 19,
	[ARC_TESTNET_CHAIN_ID]: 26,
} as const;

export type GatewayChainId = keyof typeof GATEWAY_DOMAIN_IDS;

export function getGatewayDomainId(chainId: number): number | undefined {
	return GATEWAY_DOMAIN_IDS[chainId as GatewayChainId];
}

export const GATEWAY_API_BASE =
	process.env.CIRCLE_GATEWAY_API_URL ?? "https://gateway-api-testnet.circle.com";
