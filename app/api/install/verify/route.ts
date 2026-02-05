import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import {
	paymentChainId,
	PAYMENT_TOKEN_DECIMALS,
	getChainConfig,
	isSupportedChain,
	priceToSuiAmount,
	isValidSuiAddress,
} from "@/lib/x402/payment-config";
import { linkReceiptToEntitlement } from "@/lib/payments/receipt-service";
import { verifyTransferOnChain } from "@/lib/payments/verify-onchain";
import { verifySuiTransfer } from "@/lib/payments/verify-sui";
import { installVerifySchema } from "@/types/schemas";
import { parseUnits } from "viem";

/**
 * Verify payment for an install session.
 * EVM: on-chain ERC20 Transfer receipt (chainId, transactionHash).
 * Sui: Sui transaction digest and balance change to project.suiAddress (transactionDigest, paymentType: "sui").
 */
export async function POST(request: NextRequest) {
	try {
		const parsed = installVerifySchema.safeParse(await request.json());
		if (!parsed.success) {
			return NextResponse.json(
				{
					error:
						parsed.error.flatten().formErrors?.[0] ??
						"sessionToken and transactionHash (or transactionDigest for Sui) are required",
				},
				{ status: 400 }
			);
		}
		const {
			sessionToken,
			transactionHash,
			transactionDigest,
			chainId: bodyChainId,
			paymentType,
		} = parsed.data;
		const isSui = paymentType === "sui" && transactionDigest;

		if (isSui) {
			console.log("[verify] Sui payment verification request", {
				sessionToken: sessionToken ? `${sessionToken.slice(0, 8)}...` : null,
				transactionDigest,
			});

			const attempt = await prisma.installAttempt.findUnique({
				where: { sessionToken },
				include: { project: { include: { pricingRules: true } } },
			});

			if (!attempt) {
				return NextResponse.json(
					{ error: "Unknown install session" },
					{ status: 404 }
				);
			}

			const project = attempt.project as {
				suiAddress?: string | null;
				pricingRules: { amount: number }[];
			};
			const suiAddress = project.suiAddress?.trim();
			if (!suiAddress || !isValidSuiAddress(suiAddress)) {
				return NextResponse.json(
					{ error: "Project does not accept SUI payments" },
					{ status: 400 }
				);
			}

			const price = project.pricingRules[0]?.amount ?? 0;
			const expectedAmountSui = priceToSuiAmount(price);

			const result = await verifySuiTransfer(
				transactionDigest,
				suiAddress,
				expectedAmountSui,
			);

			if (!result.verified) {
				console.log("[verify] Sui verification failed", result.reason);
				return NextResponse.json(
					{
						error: result.reason
							? `Payment verification failed: ${result.reason}`
							: "Payment verification failed",
						verified: false,
					},
					{ status: 400 }
				);
			}

			await linkReceiptToEntitlement(sessionToken, transactionDigest);
			return NextResponse.json({
				verified: true,
				receipt: transactionDigest,
			});
		}

		const chainId = bodyChainId ?? paymentChainId();
		if (!transactionHash) {
			return NextResponse.json(
				{ error: "transactionHash is required for EVM payments" },
				{ status: 400 }
			);
		}

		if (!isSupportedChain(chainId)) {
			return NextResponse.json(
				{ error: `Unsupported chain: ${chainId}` },
				{ status: 400 }
			);
		}

		const config = getChainConfig(chainId);
		if (!config) {
			return NextResponse.json(
				{ error: "Invalid chain configuration" },
				{ status: 400 }
			);
		}

		console.log("[verify] payment verification request", {
			sessionToken: sessionToken ? `${sessionToken.slice(0, 8)}...` : null,
			transactionHash,
			chainId,
		});

		const attempt = await prisma.installAttempt.findUnique({
			where: { sessionToken },
			include: { project: { include: { pricingRules: true } } },
		});

		if (!attempt) {
			return NextResponse.json(
				{ error: "Unknown install session" },
				{ status: 404 }
			);
		}

		const project = attempt.project as {
			receiveMode?: string | null;
			unifiedReceiveAddress?: string | null;
			paymentAddress: string;
			pricingRules: { amount: number }[];
		};
		const receiveMode = project.receiveMode ?? "base";
		const unifiedReceiveAddress = project.unifiedReceiveAddress?.trim();
		const isAnyChain = receiveMode === "any_chain" && unifiedReceiveAddress;
		const recipient = isAnyChain ? unifiedReceiveAddress : project.paymentAddress;

		const price = project.pricingRules[0]?.amount ?? 0;
		const expectedAmountUnits = parseUnits(String(price), PAYMENT_TOKEN_DECIMALS);
		const tokenAddress = config.usdcAddress;

		console.log("[verify] on-chain verify", {
			chainId,
			recipient,
			expectedAmountUnits: expectedAmountUnits.toString(),
			tokenAddress,
		});

		const result = await verifyTransferOnChain(
			chainId,
			transactionHash,
			recipient,
			expectedAmountUnits,
			tokenAddress,
		);

		if (!result.verified) {
			console.log("[verify] on-chain verification failed", result.reason);
			return NextResponse.json(
				{
					error: result.reason
						? `Payment verification failed: ${result.reason}`
						: "Payment verification failed",
					verified: false,
				},
				{ status: 400 }
			);
		}

		console.log("[verify] on-chain verified, linking receipt");
		await linkReceiptToEntitlement(sessionToken, transactionHash);
		console.log("[verify] receipt linked, verification complete");

		return NextResponse.json({
			verified: true,
			receipt: transactionHash,
		});
	} catch (error) {
		console.error("[verify] error", error);
		return NextResponse.json(
			{ error: "Payment verification failed" },
			{ status: 500 }
		);
	}
}
