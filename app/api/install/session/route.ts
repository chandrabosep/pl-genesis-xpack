import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import {
	paymentChainId,
	BASE_SEPOLIA_USDC_ADDRESS,
	PAYMENT_TOKEN_DECIMALS,
	PAYMENT_TOKEN_SYMBOL,
} from "@/lib/x402/payment-config";
import { parseUnits } from "viem";

/**
 * Get payment details for a session token (from /pay?session=xxx).
 * Public: no apiKey required. Returns price and address so the user can pay and submit tx hash.
 */
export async function GET(request: NextRequest) {
	try {
		const sessionToken = request.nextUrl.searchParams.get("session");
		if (!sessionToken?.trim()) {
			return NextResponse.json(
				{ error: "Missing session parameter" },
				{ status: 400 }
			);
		}

		const attempt = await prisma.installAttempt.findUnique({
			where: { sessionToken: sessionToken.trim() },
			include: {
				project: {
					include: { pricingRules: { orderBy: { id: "asc" }, take: 1 } },
				},
			},
		});
		const pricingModel = attempt?.project?.pricingModel as string | undefined;

		if (!attempt) {
			return NextResponse.json(
				{ error: "Unknown or expired session" },
				{ status: 404 }
			);
		}

		if (attempt.status !== "payment_required") {
			return NextResponse.json(
				{
					error: "Session no longer requires payment",
					status: attempt.status,
				},
				{ status: 400 }
			);
		}

		const price = attempt.project.pricingRules[0]?.amount ?? 0;
		const address = attempt.project.paymentAddress;
		const chainId = paymentChainId();
		// EIP-681 ERC-20: ethereum:<token>@<chainId>/transfer?address=<recipient>&uint256=<amount>
		// Base Sepolia USDC (6 decimals) — opens wallet with USDC transfer pre-filled
		const isEthereumAddress = /^0x[a-fA-F0-9]{40}$/.test(address);
		const amountUnits =
			isEthereumAddress && price > 0
				? parseUnits(String(price), PAYMENT_TOKEN_DECIMALS)
				: undefined;
		let paymentUri: string | undefined;
		if (amountUnits != null) {
			paymentUri = `ethereum:${BASE_SEPOLIA_USDC_ADDRESS}@${chainId}/transfer?address=${encodeURIComponent(address)}&uint256=${amountUnits}`;
		}

		return NextResponse.json({
			sessionToken: attempt.sessionToken,
			price,
			address,
			projectName: attempt.project.name,
			paymentUri,
			chainId,
			currency: PAYMENT_TOKEN_SYMBOL,
			tokenAddress: isEthereumAddress ? BASE_SEPOLIA_USDC_ADDRESS : undefined,
			amountUnits: amountUnits?.toString(),
			pricingModel: pricingModel ?? undefined,
			githubUsername: attempt.githubUsername ?? undefined,
			githubUserId: attempt.githubUserId ?? undefined,
		});
	} catch {
		return NextResponse.json(
			{ error: "Failed to load session" },
			{ status: 500 }
		);
	}
}

const GITHUB_USERNAME_REGEX = /^[a-zA-Z0-9-]+$/;

/**
 * Update install attempt with GitHub username (for subscription when not set at install time).
 * Call from pay page when user enters their GitHub username before paying.
 */
export async function PATCH(request: NextRequest) {
	try {
		let sessionToken: string | null =
			request.nextUrl.searchParams.get("session");
		let body: { sessionToken?: string; githubUsername?: string } = {};
		try {
			body = await request.json();
		} catch {
			// optional body
		}
		sessionToken = sessionToken ?? body.sessionToken ?? null;
		const githubUsername =
			typeof body.githubUsername === "string"
				? body.githubUsername.trim()
				: "";

		if (!sessionToken?.trim()) {
			return NextResponse.json(
				{ error: "Missing session parameter" },
				{ status: 400 }
			);
		}
		if (!githubUsername || !GITHUB_USERNAME_REGEX.test(githubUsername)) {
			return NextResponse.json(
				{ error: "Valid githubUsername is required (alphanumeric and hyphens)" },
				{ status: 400 }
			);
		}

		const attempt = await prisma.installAttempt.findUnique({
			where: { sessionToken: sessionToken.trim() },
			include: { project: true },
		});
		if (!attempt) {
			return NextResponse.json(
				{ error: "Unknown or expired session" },
				{ status: 404 }
			);
		}
		if (attempt.status !== "payment_required") {
			return NextResponse.json(
				{ error: "Session no longer requires payment" },
				{ status: 400 }
			);
		}
		if (attempt.project.pricingModel !== "subscription") {
			return NextResponse.json(
				{ error: "GitHub username is only used for subscription pricing" },
				{ status: 400 }
			);
		}

		await prisma.installAttempt.update({
			where: { id: attempt.id },
			data: { githubUsername },
		});

		return NextResponse.json({ githubUsername });
	} catch {
		return NextResponse.json(
			{ error: "Failed to update session" },
			{ status: 500 }
		);
	}
}
