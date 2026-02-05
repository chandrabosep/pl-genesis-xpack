import { getRpcUrls } from "@/lib/x402/payment-config";
import { keccak256, toBytes } from "viem";

/** ERC20 Transfer(address,address,uint256) topic0 */
const TRANSFER_TOPIC =
	keccak256(toBytes("Transfer(address,address,uint256)"));

export type VerifyOnChainResult =
	| { verified: true }
	| { verified: false; reason: string };

/**
 * Verify an ERC20 transfer on-chain: tx succeeded and a Transfer log exists
 * to the expected recipient with at least the expected amount.
 * Tries fallback RPC URLs (e.g. for Sonic Testnet) when the primary fails.
 */
export async function verifyTransferOnChain(
	chainId: number,
	transactionHash: string,
	recipient: string,
	expectedAmountUnits: bigint,
	tokenAddress: string,
): Promise<VerifyOnChainResult> {
	const rpcUrls = getRpcUrls(chainId);
	let lastError: Error | null = null;
	for (const rpcUrl of rpcUrls) {
		try {
			const receipt = await getTransactionReceipt(rpcUrl, transactionHash);
			if (receipt != null) {
				return checkReceipt(receipt, recipient, expectedAmountUnits, tokenAddress);
			}
		} catch (e) {
			lastError = e instanceof Error ? e : new Error(String(e));
		}
	}
	if (lastError) {
		return { verified: false, reason: lastError.message ?? "RPC error" };
	}
	return { verified: false, reason: "Transaction not found" };
}

function checkReceipt(
	receipt: Receipt,
	recipient: string,
	expectedAmountUnits: bigint,
	tokenAddress: string,
): VerifyOnChainResult {
	if (!receipt) {
		return { verified: false, reason: "Transaction not found" };
	}
	if (receipt.status !== "0x1" && receipt.status !== "1") {
		return { verified: false, reason: "Transaction failed or reverted" };
	}

	const wantRecipient = (recipient.startsWith("0x") ? recipient : "0x" + recipient).toLowerCase();
	for (const log of receipt.logs ?? []) {
		if (log.address?.toLowerCase() !== tokenAddress.toLowerCase()) continue;
		if (log.topics?.[0] !== TRANSFER_TOPIC) continue;
		// topics[1]=from, topics[2]=to (indexed)
		const toTopic = log.topics[2];
		if (!toTopic) continue;
		const logTo = "0x" + toTopic.slice(-40).toLowerCase();
		if (logTo !== wantRecipient) continue;
		// data = value (uint256, 32 bytes)
		const valueHex = log.data?.startsWith("0x") ? log.data : "0x" + log.data;
		const value = valueHex ? BigInt(valueHex) : BigInt(0);
		if (value >= expectedAmountUnits) {
			return { verified: true };
		}
		return { verified: false, reason: "Transfer amount less than required" };
	}

	return { verified: false, reason: "No matching Transfer to recipient found" };
}

type Receipt = {
	status?: string;
	logs?: Array<{
		address?: string;
		topics?: string[];
		data?: string;
	}>;
};

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
			params: [txHash.startsWith("0x") ? txHash : "0x" + txHash],
		}),
	});
	const json = (await res.json()) as { result?: Receipt | null; error?: { message?: string } };
	if (json.error) {
		throw new Error(json.error.message ?? "RPC error");
	}
	return json.result ?? null;
}
