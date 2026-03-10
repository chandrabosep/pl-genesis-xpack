/**
 * Starknet payment requirements using x402-starknet.
 * Uses the library for consistent amount conversion (USD → atomic units) and
 * payment requirements shape so price/amount detection works correctly.
 */
import {
	buildPaymentRequirements,
	toAtomicUnits,
	type PaymentRequirements,
} from "x402-starknet";
import { getStarknetUsdcAddress } from "@/lib/x402/payment-config";

/** CAIP-2 network id for Starknet Sepolia (used by x402-starknet). */
export const STARKNET_SEPOLIA_NETWORK = "starknet:sepolia" as const;

/**
 * Build x402 PaymentRequirements for Starknet Sepolia USDC.
 * Uses the project's configured USDC contract (STARKNET_USDC_ADDRESS) and
 * the library's toAtomicUnits for correct price → amount conversion.
 *
 * @param priceUsd - Price in USD (e.g. 1.5 for $1.50)
 * @param payTo - Recipient Starknet address (0x…)
 * @returns PaymentRequirements or undefined if USDC address is not configured
 */
export function getStarknetPaymentRequirements(
	priceUsd: number,
	payTo: string,
): PaymentRequirements | undefined {
	const usdcAddress = getStarknetUsdcAddress();
	if (!usdcAddress) return undefined;

	// Use library's toAtomicUnits for USDC (6 decimals) so amount is correct
	const atomicAmount = toAtomicUnits(priceUsd, "USDC");

	return buildPaymentRequirements({
		network: STARKNET_SEPOLIA_NETWORK,
		amount: Number(atomicAmount),
		asset: usdcAddress,
		payTo: payTo.trim().startsWith("0x") ? payTo.trim() : `0x${payTo.trim()}`,
		extra: {
			name: "USD Coin",
			symbol: "USDC",
			decimals: 6,
		},
	});
}

/**
 * Get expected USDC amount in atomic units (bigint) for verification.
 * Uses the same conversion as getStarknetPaymentRequirements so server
 * verification matches the built requirements.
 */
export function getStarknetExpectedAmountAtomic(priceUsd: number): bigint | undefined {
	const usdcAddress = getStarknetUsdcAddress();
	if (!usdcAddress) return undefined;
	const atomicStr = toAtomicUnits(priceUsd, "USDC");
	return BigInt(atomicStr);
}
