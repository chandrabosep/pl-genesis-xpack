import { NextRequest, NextResponse } from "next/server";
import { confirmInstall } from "@/lib/x402/install-service";
import { installConfirmSchema } from "@/types/schemas";

const AUTH_FAILURE_REASONS = [
  "Invalid project or API key",
  "Invalid or expired session",
];

export async function POST(request: NextRequest) {
  try {
    const body = installConfirmSchema.parse(await request.json());
    const decision = await confirmInstall(body);

    if (!decision.allowed && AUTH_FAILURE_REASONS.includes(decision.reason)) {
      return NextResponse.json(
        { error: decision.reason },
        { status: 401 },
      );
    }

    return NextResponse.json({
      status: decision.allowed ? "allowed" : "payment_required",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 },
    );
  }
}

