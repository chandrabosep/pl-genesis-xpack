import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const WAGMI_STORAGE_KEY = "wagmi.store";

// Minimal parser for wagmi cookie state (avoids importing wagmi in Edge runtime)
// Note: wagmi does NOT persist `status` to cookies (excluded for reconnection logic).
// Persisted fields: connections, chainId, current. Use current + connections to detect auth.
function getWalletConnectionStatus(cookieHeader: string | null): boolean {
	if (!cookieHeader) return false;

	const cookie = cookieHeader
		.split("; ")
		.find((c) => c.startsWith(`${WAGMI_STORAGE_KEY}=`));
	if (!cookie) return false;

	const value = cookie.slice(WAGMI_STORAGE_KEY.length + 1);
	try {
		const parsed = JSON.parse(value, (_, v) => {
			if (v?.__type === "Map") return new Map(v.value);
			if (v?.__type === "bigint") return BigInt(v.value);
			return v;
		});
		const state = parsed?.state;
		if (!state) return false;
		// Connected = has current connector and at least one connection
		const hasCurrent = state.current != null && state.current !== "";
		const hasConnections =
			state.connections instanceof Map
				? state.connections.size > 0
				: (state.connections?.value?.length ?? 0) > 0;
		return hasCurrent && hasConnections;
	} catch {
		return false;
	}
}

const protectedPaths = ["/billing", "/dashboard", "/projects"];

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const isProtectedRoute = protectedPaths.some(
		(path) => pathname === path || pathname.startsWith(`${path}/`),
	);

	if (isProtectedRoute) {
		const isLoggedIn = getWalletConnectionStatus(
			request.headers.get("cookie"),
		);
		if (!isLoggedIn) {
			const url = request.nextUrl.clone();
			url.pathname = "/";
			return NextResponse.redirect(url);
		}
	}

	return NextResponse.next();
}

export const config = {
	// Exclude prefetch requests - they can interfere with wagmi hydration
	// and cause the wallet button to stay in a loading/reconnecting state
	matcher: [
		{
			source: "/billing/:path*",
			missing: [
				{ type: "header", key: "next-router-prefetch" },
				{ type: "header", key: "purpose", value: "prefetch" },
			],
		},
		{
			source: "/dashboard/:path*",
			missing: [
				{ type: "header", key: "next-router-prefetch" },
				{ type: "header", key: "purpose", value: "prefetch" },
			],
		},
		{
			source: "/projects/:path*",
			missing: [
				{ type: "header", key: "next-router-prefetch" },
				{ type: "header", key: "purpose", value: "prefetch" },
			],
		},
	],
};
