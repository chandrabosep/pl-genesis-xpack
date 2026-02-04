import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { startInstall } from "@/lib/x402/install-service";
import { installStartSchema } from "@/types/schemas";
import { X402_HEADERS } from "@/types/constants";

const AUTH_FAILURE_REASONS = [
  "Invalid project or API key",
  "Invalid or expired session",
];

export async function POST(request: NextRequest) {
  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request: body must be JSON" },
        { status: 400 },
      );
    }
    const body = installStartSchema.parse(raw);
    const decision = await startInstall(body);

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
    if (error instanceof ZodError) {
      const first = error.errors[0];
      const msg = first
        ? `${first.path.join(".")}: ${first.message}`
        : "Validation failed";
      return NextResponse.json({ error: `Invalid request: ${msg}` }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

