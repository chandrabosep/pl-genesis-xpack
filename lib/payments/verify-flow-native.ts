import {
	getRpcUrls,
	FLOW_EVM_TESTNET_CHAIN_ID,
} from "@/lib/x402/payment-config";

export type VerifyFlowNativeResult =
	| { verified: true }
	| { verified: false; reason: string };

/**
 * Verify a native FLOW transfer on Flow EVM Testnet (chain 545).
 * Checks that the transaction succeeded and sent at least expectedAmountWei FLOW to recipient.
 */
export async function verifyFlowNativeTransfer(
	transactionHash: string,
	recipient: string,
	expectedAmountWei: bigint,
): Promise<VerifyFlowNativeResult> {
	const rpcUrls = getRpcUrls(FLOW_EVM_TESTNET_CHAIN_ID);
	const wantTo = (recipient.startsWith("0x") ? recipient : "0x" + recipient).toLowerCase();
	const txHash = transactionHash.startsWith("0x") ? transactionHash : "0x" + transactionHash;

	for (const rpcUrl of rpcUrls) {
		try {
			const [tx, receipt] = await Promise.all([
				getTransaction(rpcUrl, txHash),
				getTransactionReceipt(rpcUrl, txHash),
			]);
			if (!tx) {
				return { verified: false, reason: "Transaction not found" };
			}
			if (!receipt || (receipt.status !== "0x1" && receipt.status !== "1")) {
				return { verified: false, reason: "Transaction failed or not mined" };
			}
			const to = (tx.to ?? "").toLowerCase();
			if (to !== wantTo) {
				return { verified: false, reason: "Recipient address does not match" };
			}
			const value = BigInt(tx.value ?? "0");
			if (value < expectedAmountWei) {
				return {
					verified: false,
					reason: `Amount sent (${value}) is less than required (${expectedAmountWei})`,
				};
			}
			return { verified: true };
		} catch (e) {
			// try next RPC
			continue;
		}
	}
	return { verified: false, reason: "Transaction not found or RPC error" };
}

type Tx = { to?: string; value?: string };

async function getTransaction(rpcUrl: string, txHash: string): Promise<Tx | null> {
	const res = await fetch(rpcUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: 1,
			method: "eth_getTransactionByHash",
			params: [txHash],
		}),
	});
	const json = (await res.json()) as { result?: Tx | null; error?: { message?: string } };
	if (json.error) throw new Error(json.error.message ?? "RPC error");
	return json.result ?? null;
}

type Receipt = { status?: string };

async function getTransactionReceipt(
	rpcUrl: string,
	txHash: string,
): Promise<Receipt | null> {
	const res = await fetch(rpcUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: 1,
			method: "eth_getTransactionReceipt",
			params: [txHash],
		}),
	});
	const json = (await res.json()) as { result?: Receipt | null; error?: { message?: string } };
	if (json.error) throw new Error(json.error.message ?? "RPC error");
	return json.result ?? null;
}
