import { NextRequest, NextResponse } from "next/server";
import { checkInstallStatus } from "@/lib/x402/install-service";
import { installStatusSchema } from "@/types/schemas";
import { X402_HEADERS } from "@/types/constants";

const AUTH_FAILURE_REASONS = [
  "Invalid project or API key",
  "Invalid or expired session",
];

export async function POST(request: NextRequest) {
  try {
    const body = installStatusSchema.parse(await request.json());
    const decision = await checkInstallStatus(body);

    if (decision.allowed) {
      return NextResponse.json({ status: "allowed" });
    }

    if (AUTH_FAILURE_REASONS.includes(decision.reason)) {
      return NextResponse.json(
        { error: decision.reason },
        { status: 401 },
      );
    }

    const headers = new Headers();
    if (decision.payment?.sessionToken) {
      headers.set(X402_HEADERS.price, decision.payment.price.toString());
      headers.set(X402_HEADERS.address, decision.payment.address);
      headers.set(X402_HEADERS.session, decision.payment.sessionToken);
      headers.set(X402_HEADERS.instructions, decision.payment.instructions);
    }

    return new NextResponse(
      JSON.stringify({
        status: "payment_required",
        reason: decision.reason,
        payment: decision.payment,
      }),
      { status: 402, headers },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 },
    );
  }
}

