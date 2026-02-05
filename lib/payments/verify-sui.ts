/**
 * Verify a native SUI transfer by transaction digest (mainnet or testnet).
 * Uses balance changes: recipient must have a positive SUI balance change >= expected amount.
 * Network is controlled by SUI_NETWORK / NEXT_PUBLIC_SUI_NETWORK (testnet | mainnet).
 */

import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { getSuiRpcUrl, getSuiNetwork, SUI_DECIMALS } from "@/lib/x402/payment-config";

const SUI_COIN_TYPE = "0x2::sui::SUI";

export type VerifySuiResult =
	| { verified: true }
	| { verified: false; reason: string };

function ownerToAddress(owner: { AddressOwner?: string; ObjectOwner?: string } | string): string | null {
	if (typeof owner === "string") return owner;
	if (owner?.AddressOwner) return owner.AddressOwner;
	if (owner?.ObjectOwner) return owner.ObjectOwner;
	return null;
}

/**
 * Verify that a Sui transaction sent at least `expectedAmountSui` SUI to `recipient`.
 * @param transactionDigest - Sui transaction block digest (from wallet/explorer)
 * @param recipient - Sui address that should have received the payment (0x + 64 hex)
 * @param expectedAmountSui - Amount in SUI (human-readable, e.g. "10")
 */
export async function verifySuiTransfer(
	transactionDigest: string,
	recipient: string,
	expectedAmountSui: string,
): Promise<VerifySuiResult> {
	const digest = transactionDigest.trim();
	if (!digest) {
		return { verified: false, reason: "Missing transaction digest" };
	}

	const wantRecipient = recipient.startsWith("0x") ? recipient : `0x${recipient}`;
	const expectedMist = BigInt(
		Math.ceil(parseFloat(expectedAmountSui) * 10 ** SUI_DECIMALS),
	);
	if (expectedMist <= BigInt(0)) {
		return { verified: false, reason: "Invalid expected amount" };
	}

	const network = getSuiNetwork();
	const url = getSuiRpcUrl();
	const client = new SuiJsonRpcClient({ url, network });

	try {
		const tx = await client.getTransactionBlock({
			digest,
			options: { showBalanceChanges: true, showEffects: true },
		});

		if (!tx) {
			return { verified: false, reason: "Transaction not found" };
		}

		const status = (tx.effects as { status?: { status?: string; error?: string } })?.status?.status;
		if (status !== "success") {
			const err = (tx.effects as { status?: { error?: string } })?.status?.error;
			return { verified: false, reason: err ?? "Transaction did not succeed" };
		}

		const balanceChanges = tx.balanceChanges ?? [];
		for (const change of balanceChanges) {
			const addr = ownerToAddress(change.owner as { AddressOwner?: string; ObjectOwner?: string });
			if (!addr) continue;
			const normalized = addr.startsWith("0x") ? addr : `0x${addr}`;
			if (normalized.toLowerCase() !== wantRecipient.toLowerCase()) continue;
			if (change.coinType !== SUI_COIN_TYPE) continue;

			const amount = BigInt(change.amount);
			if (amount >= expectedMist) {
				return { verified: true };
			}
			return {
				verified: false,
				reason: `Transfer amount less than required (received ${change.amount} MIST)`,
			};
		}

		return {
			verified: false,
			reason: "No SUI balance change to recipient found in transaction",
		};
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return { verified: false, reason: msg || "RPC error" };
	}
}
