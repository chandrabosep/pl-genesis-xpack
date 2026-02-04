import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import {
	paymentChainId,
	BASE_SEPOLIA_USDC_ADDRESS,
	PAYMENT_TOKEN_DECIMALS,
} from "@/lib/x402/payment-config";
import { linkReceiptToEntitlement } from "@/lib/payments/receipt-service";
import { verifyTransferOnChain } from "@/lib/payments/verify-onchain";
import { installVerifySchema } from "@/types/schemas";
import { parseUnits } from "viem";

/**
 * Verify payment for an install session.
 * Uses on-chain verification (ERC20 Transfer receipt) for our direct-transfer flow.
 * Isolation: sessionToken uniquely identifies one InstallAttempt (one project); no cross-session leakage.
 * After verification, links receipt and entitlement so the user can re-run install.
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = installVerifySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "sessionToken and transactionHash are required" },
        { status: 400 }
      );
    }
    const { sessionToken, transactionHash } = parsed.data;
    console.log("[verify] payment verification request", {
      sessionToken: sessionToken ? `${sessionToken.slice(0, 8)}...` : null,
      transactionHash,
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

    const chainId = paymentChainId();
    const recipient = attempt.project.paymentAddress;
    const price = attempt.project.pricingRules[0]?.amount ?? 0;
    const expectedAmountUnits = parseUnits(String(price), PAYMENT_TOKEN_DECIMALS);
    const tokenAddress = BASE_SEPOLIA_USDC_ADDRESS;

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

