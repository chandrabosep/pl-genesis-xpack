import { NextRequest, NextResponse } from "next/server";
import { getBillingOverview } from "@/lib/payments/billing-service";
import { billingSchema, type BillingSchema } from "@/types/schemas";
import { requireWalletAddressFromHeaders } from "@/lib/auth/wallet-auth";

export async function GET(request: NextRequest) {
  try {
    const walletAddress = requireWalletAddressFromHeaders(request);
    const parsed: BillingSchema = billingSchema.parse({
      projectId: request.nextUrl.searchParams.get("projectId") ?? "",
    });
    const overview = await getBillingOverview(parsed.projectId, walletAddress);
    return NextResponse.json(overview);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}

