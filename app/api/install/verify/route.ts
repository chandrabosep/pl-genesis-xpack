import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import {
	facilitatorUrl,
	paymentChainId,
	BASE_SEPOLIA_CHAIN_ID,
} from "@/lib/x402/payment-config";
import { linkReceiptToEntitlement } from "@/lib/payments/receipt-service";
import { installVerifySchema } from "@/types/schemas";

/**
 * Verify payment for an install session.
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

    // Skip external facilitator on Base Sepolia (testnet); x402.org verifies mainnet only.
    // We accept the tx hash and link the receipt so testnet payments succeed.
    const facilitator = facilitatorUrl();
    const isBaseSepolia = paymentChainId() === BASE_SEPOLIA_CHAIN_ID;
    if (facilitator && !isBaseSepolia) {
      const verifyResponse = await fetch(`${facilitator}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionHash,
          amount: attempt.project.pricingRules[0]?.amount ?? 0,
          recipient: attempt.project.paymentAddress,
        }),
      });

      if (!verifyResponse.ok) {
        return NextResponse.json(
          { error: "Payment verification failed", verified: false },
          { status: 400 }
        );
      }

      const verifyData = await verifyResponse.json();
      if (!verifyData.verified) {
        return NextResponse.json(
          { error: "Payment not verified", verified: false },
          { status: 400 }
        );
      }
    }

    await linkReceiptToEntitlement(sessionToken, transactionHash);

    return NextResponse.json({
      verified: true,
      receipt: transactionHash,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}

