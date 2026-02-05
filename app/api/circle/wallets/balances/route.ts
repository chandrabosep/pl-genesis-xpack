import { NextRequest, NextResponse } from "next/server";
import { listWalletsWithBalances } from "@/lib/circle/wallets";

/**
 * GET: List Circle Programmable Wallets (developer-controlled) with balances.
 * Uses Circle Wallets API. Requires CIRCLE_API_KEY in env.
 * Query: blockchain (optional, e.g. BASE-SEPOLIA, ARC-TESTNET).
 */
export async function GET(request: NextRequest) {
	try {
		const blockchain = request.nextUrl.searchParams.get("blockchain") ?? undefined;
		const walletSetId = request.nextUrl.searchParams.get("walletSetId") ?? undefined;
		const pageSizeParam = request.nextUrl.searchParams.get("pageSize");
		const pageSize = pageSizeParam ? Math.min(50, Math.max(1, Number(pageSizeParam))) : undefined;

		const result = await listWalletsWithBalances({
			blockchain,
			walletSetId,
			pageSize,
		});

		return NextResponse.json(result);
	} catch (err) {
		console.error("[circle/wallets/balances]", err);
		const message = err instanceof Error ? err.message : "Failed to list wallets";
		const status = message.includes("CIRCLE_API_KEY") ? 503 : 500;
		return NextResponse.json(
			{ error: message },
			{ status }
		);
	}
}
