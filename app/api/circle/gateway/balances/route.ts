import { NextRequest, NextResponse } from "next/server";
import { getGatewayBalances } from "@/lib/circle/gateway";
import { getGatewayDomainId } from "@/lib/circle/gateway-config";
import { BASE_SEPOLIA_CHAIN_ID, ARC_TESTNET_CHAIN_ID } from "@/lib/x402/payment-config";

/**
 * GET: Return Circle Gateway USDC balance for a depositor.
 * Query: depositor (0x address). Returns balance per domain (Base Sepolia = 6, Arc = 26) and total.
 */
export async function GET(request: NextRequest) {
	try {
		const depositor = request.nextUrl.searchParams.get("depositor")?.trim();
		if (!depositor || !/^0x[a-fA-F0-9]{40}$/.test(depositor)) {
			return NextResponse.json(
				{ error: "depositor query (0x address) required" },
				{ status: 400 }
			);
		}
		const domains = [
			getGatewayDomainId(BASE_SEPOLIA_CHAIN_ID),
			getGatewayDomainId(ARC_TESTNET_CHAIN_ID),
		].filter((d): d is number => d != null);
		const balances = await getGatewayBalances({ depositor, domains });
		const byDomain: Record<number, string> = {};
		let total = 0;
		for (const b of balances) {
			byDomain[b.domain] = b.balance;
			total += parseFloat(b.balance);
		}
		return NextResponse.json({
			depositor,
			byDomain: {
				[BASE_SEPOLIA_CHAIN_ID]: byDomain[getGatewayDomainId(BASE_SEPOLIA_CHAIN_ID)!] ?? "0",
				[ARC_TESTNET_CHAIN_ID]: byDomain[getGatewayDomainId(ARC_TESTNET_CHAIN_ID)!] ?? "0",
			},
			total: total.toFixed(6),
		});
	} catch (err) {
		console.error("[gateway/balances]", err);
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Failed to fetch balance" },
			{ status: 500 }
		);
	}
}
