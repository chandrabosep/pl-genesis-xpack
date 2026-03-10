import { hash as starkHash } from "starknet";
import { createProvider } from "x402-starknet";
import { getStarknetRpcUrl, getStarknetUsdcAddress } from "@/lib/x402/payment-config";
import { STARKNET_SEPOLIA_NETWORK } from "./starknet-requirements";

export type VerifyStarknetResult =
	| { verified: true }
	| { verified: false; reason: string };

function normalize0x(hex: string): string {
	const t = hex.trim();
	return t.startsWith("0x") ? t : `0x${t}`;
}

function feltToBigInt(hex: string | undefined | null): bigint | null {
	if (!hex || typeof hex !== "string") return null;
	try {
		return BigInt(normalize0x(hex));
	} catch {
		return null;
	}
}

function uint256ToBigInt(low: string, high: string): bigint {
	const lo = BigInt(normalize0x(low));
	const hi = BigInt(normalize0x(high));
	return lo + (hi << BigInt(128));
}

/**
 * Verify a Starknet Sepolia USDC transfer by transaction hash.
 * Expects an ERC20 `Transfer` event emitted by the USDC contract where `to == recipient`
 * and `value >= expectedAmountUnits`.
 *
 * Note: USDC contract address must be provided via STARKNET_USDC_ADDRESS (or NEXT_PUBLIC_…).
 */
export async function verifyStarknetUsdcTransfer(
	transactionHash: string,
	recipient: string,
	expectedAmountUnits: bigint,
): Promise<VerifyStarknetResult> {
	// Small helper so we can retry when the RPC node has not indexed the tx yet.
	const sleep = (ms: number) =>
		new Promise<void>((resolve) => setTimeout(resolve, ms));

	const txHash = normalize0x(transactionHash);
	if (!/^0x[a-fA-F0-9]{1,64}$/.test(txHash)) {
		return { verified: false, reason: "Invalid Starknet transaction hash" };
	}
	const wantRecipientBig = feltToBigInt(recipient);
	if (wantRecipientBig == null) {
		return { verified: false, reason: "Invalid recipient address" };
	}
	const usdc = getStarknetUsdcAddress();
	if (!usdc) {
		return {
			verified: false,
			reason:
				"Starknet USDC contract is not configured (set STARKNET_USDC_ADDRESS)",
		};
	}

	const provider = createProvider(STARKNET_SEPOLIA_NETWORK, {
		rpcUrl: getStarknetRpcUrl(),
	});

	// Retry a few times to handle "TXN_HASH_NOT_FOUND" right after broadcast.
	const maxAttempts = 5;
	let lastError: string | undefined;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const receipt = await provider.getTransactionReceipt(txHash);
		// Receipt shape varies by starknet.js versions; rely on status and events presence.
		const status =
			(receipt as { status?: string }).status ??
			(receipt as { execution_status?: string }).execution_status ??
			"";
		if (status && !/ACCEPTED|SUCCEEDED/i.test(status)) {
			return { verified: false, reason: "Transaction did not succeed" };
		}

		const events =
			(receipt as {
				events?: Array<{
					from_address?: string;
					keys?: string[];
					data?: string[];
				}>;
			}).events ?? [];
		const transferKey = starkHash.getSelectorFromName("Transfer");
		const wantUsdcBig = feltToBigInt(usdc);

		for (const ev of events) {
			// Require that the emitting contract is the configured USDC token when available.
			if (ev.from_address) {
				const fromBig = feltToBigInt(ev.from_address);
				if (fromBig == null) continue;
				if (wantUsdcBig != null && fromBig !== wantUsdcBig) continue;
			}

			const keys = ev.keys ?? [];
			if (
				!keys[0] ||
				normalize0x(keys[0]).toLowerCase() !==
					normalize0x(transferKey).toLowerCase()
			)
				continue;

			const data = ev.data ?? [];

			// Starknet ERC20 `Transfer` layouts we support (strictly):
			// - Cairo 0 style: data = [from, to, value.low, value.high]
			// - Cairo 1 / OZ common: keys = [Transfer, from, to], data = [value.low, value.high]
			const candidateToFields: (string | undefined)[] = [
				// Cairo 0 style (data contains to)
				data[1],
				// Cairo 1 / OZ style (keys contain to)
				keys[2],
			];

			let matchedAmount: bigint | null = null;

			for (const toField of candidateToFields) {
				const toBig = feltToBigInt(toField);
				if (toBig == null || toBig !== wantRecipientBig) continue;

				// Amount can be in either:
				// - data[2], data[3] (Cairo 0 style)
				// - data[0], data[1] (Cairo 1 / OZ style)
				let low: string | undefined;
				let high: string | undefined;
				if (data.length >= 4) {
					low = data[2];
					high = data[3] ?? "0x0";
				} else if (data.length >= 2) {
					low = data[0];
					high = data[1] ?? "0x0";
				}

				if (!low) continue;
				const value = uint256ToBigInt(low, high ?? "0x0");
				matchedAmount = value;
				if (value >= expectedAmountUnits) {
					return { verified: true };
				}
				break;
			}

			if (matchedAmount != null && matchedAmount < expectedAmountUnits) {
				return {
					verified: false,
					reason: "Transfer amount less than required",
				};
			}
		}

		return {
			verified: false,
			reason: "No matching Transfer to recipient found",
			};
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			lastError = msg || "RPC error";
			// Typical when node hasn't indexed tx yet; back off and retry a few times.
			if (
				/Transaction hash not found|TXN_HASH_NOT_FOUND/i.test(msg) &&
				attempt < maxAttempts
			) {
				await sleep(2_000);
				continue;
			}
			// Any other error (or final attempt) – return immediately.
			return { verified: false, reason: lastError };
		}
	}

	return {
		verified: false,
		reason: lastError ?? "RPC error",
	};
}

