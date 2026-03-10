import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import {
	paymentChainId,
	PAYMENT_TOKEN_DECIMALS,
	PAYMENT_TOKEN_SYMBOL,
	SUPPORTED_CHAINS,
	getChainConfig,
	priceToSuiAmount,
	SUI_SYMBOL,
	isValidSuiAddress,
	getSuiNetwork,
	isValidStarknetAddress,
	getStarknetNetwork,
	getStarknetUsdcAddress,
} from "@/lib/x402/payment-config";
import { parseUnits } from "viem";

/**
 * Get payment details for a session token (from /pay?session=xxx).
 * Public: no apiKey required. Returns price and address so the user can pay and submit tx hash.
 * Returns a single EVM payment option (USDC) unless Sui-only.
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
		const receiveMode = (attempt?.project?.receiveMode as string | null) ?? "base";
		const suiAddress = (attempt?.project?.suiAddress as string | null)?.trim() ?? null;
		const starknetAddress =
			((attempt?.project as unknown as { starknetAddress?: string | null })
				?.starknetAddress as string | null)?.trim() ?? null;

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
		const isSuiOnly = receiveMode === "sui" && suiAddress && isValidSuiAddress(suiAddress);
		const isStarknetOnly =
			receiveMode === "starknet" &&
			starknetAddress &&
			isValidStarknetAddress(starknetAddress);
		const address = isSuiOnly
			? suiAddress
			: isStarknetOnly
				? starknetAddress
			: attempt.project.paymentAddress;
		const isEthereumAddress =
			!isSuiOnly && !isStarknetOnly && /^0x[a-fA-F0-9]{40}$/.test(address);
		const amountUnits =
			!isSuiOnly && !isStarknetOnly && isEthereumAddress && price > 0
				? parseUnits(String(price), PAYMENT_TOKEN_DECIMALS)
				: undefined;

		// Build payment option(s) for USDC (only when not Sui-only)
		type PaymentOption = {
			chainId: number;
			paymentUri: string;
			tokenAddress: string;
			chainName: string;
		};
		const paymentOptions: PaymentOption[] = [];

		if (!isSuiOnly && !isStarknetOnly && amountUnits != null) {
			const chainId = paymentChainId();
			const config = getChainConfig(chainId) ?? SUPPORTED_CHAINS[0];
			if (config) {
				paymentOptions.push({
					chainId: config.chainId,
					paymentUri: `ethereum:${config.usdcAddress}@${config.chainId}/transfer?address=${encodeURIComponent(address)}&uint256=${amountUnits}`,
					tokenAddress: config.usdcAddress,
					chainName: config.name,
				});
			}
		}

		const firstOption = paymentOptions[0];

		// Sui payment option: when receiveMode is sui or project has Sui address
		let suiPaymentOption: {
			amountSui: string;
			suiAddress: string;
			currency: string;
			network: "mainnet" | "testnet";
		} | undefined;
		if (price > 0 && suiAddress && isValidSuiAddress(suiAddress)) {
			suiPaymentOption = {
				amountSui: priceToSuiAmount(price),
				suiAddress,
				currency: SUI_SYMBOL,
				network: getSuiNetwork(),
			};
		}

		// Starknet payment option: when receiveMode is starknet and project has a Starknet address
		let starknetPaymentOption:
			| {
					amountUsdc: string;
					starknetAddress: string;
					currency: string;
					network: "sepolia";
					starknetUsdcAddress?: string;
			  }
			| undefined;
		const starknetUsdc = getStarknetUsdcAddress();
		if (price > 0 && starknetAddress && isValidStarknetAddress(starknetAddress)) {
			starknetPaymentOption = {
				amountUsdc: String(price),
				starknetAddress,
				currency: PAYMENT_TOKEN_SYMBOL,
				network: getStarknetNetwork(),
				starknetUsdcAddress: starknetUsdc ?? undefined,
			};
		}

		return NextResponse.json({
			sessionToken: attempt.sessionToken,
			price,
			address,
			projectName: attempt.project.name,
			paymentUri: isSuiOnly || isStarknetOnly ? undefined : firstOption?.paymentUri,
			chainId: isSuiOnly || isStarknetOnly ? undefined : firstOption?.chainId ?? paymentChainId(),
			currency: isSuiOnly ? SUI_SYMBOL : PAYMENT_TOKEN_SYMBOL,
			tokenAddress: isSuiOnly || isStarknetOnly ? undefined : firstOption?.tokenAddress,
			amountUnits: amountUnits?.toString(),
			pricingModel: pricingModel ?? undefined,
			githubUsername: attempt.githubUsername ?? undefined,
			githubUserId: attempt.githubUserId ?? undefined,
			receiveMode: isSuiOnly ? "sui" : isStarknetOnly ? "starknet" : "base",
			paymentOptions: paymentOptions.length > 0 ? paymentOptions : undefined,
			suiPaymentOption: isSuiOnly ? suiPaymentOption : suiPaymentOption,
			starknetPaymentOption: isStarknetOnly ? starknetPaymentOption : starknetPaymentOption,
		});
	} catch {
		return NextResponse.json(
			{ error: "Failed to load session" },
			{ status: 500 }
		);
	}
}
