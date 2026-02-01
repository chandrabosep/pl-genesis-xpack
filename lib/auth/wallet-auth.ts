import { NextRequest } from "next/server";

export function requireWalletAddressFromHeaders(request: NextRequest): string {
	const value = request.headers.get("x-wallet-address");
	if (!value || typeof value !== "string" || value.trim() === "") {
		throw new Error("Missing or invalid x-wallet-address header");
	}
	return value.trim().toLowerCase();
}
