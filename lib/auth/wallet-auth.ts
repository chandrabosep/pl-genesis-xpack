import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";

export function requireWalletAddressFromHeaders(request: NextRequest): string {
	const value = request.headers.get("x-wallet-address");
	if (!value || typeof value !== "string" || value.trim() === "") {
		throw new Error("Missing or invalid x-wallet-address header");
	}
	return value.trim().toLowerCase();
}

export async function getOrCreateDeveloper(walletAddress: string) {
	const normalized = walletAddress.trim().toLowerCase();
	const developer = await prisma.developer.upsert({
		where: { walletAddress: normalized },
		create: { walletAddress: normalized },
		update: {},
	});
	return developer;
}
