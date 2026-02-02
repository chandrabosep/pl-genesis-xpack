import { NextRequest, NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/dashboard/stats-service";
import { requireWalletAddressFromHeaders } from "@/lib/auth/wallet-auth";

export async function GET(request: NextRequest) {
  try {
    const walletAddress = requireWalletAddressFromHeaders(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") ?? undefined;
    const dateFromRaw = searchParams.get("dateFrom");
    const dateToRaw = searchParams.get("dateTo");

    const dateFrom = dateFromRaw ? new Date(dateFromRaw) : undefined;
    const dateTo = dateToRaw ? new Date(dateToRaw) : undefined;

    if (dateFrom && isNaN(dateFrom.getTime())) {
      return NextResponse.json(
        { error: "Invalid dateFrom" },
        { status: 400 }
      );
    }
    if (dateTo && isNaN(dateTo.getTime())) {
      return NextResponse.json(
        { error: "Invalid dateTo" },
        { status: 400 }
      );
    }

    const stats = await getDashboardStats(walletAddress, {
      projectId,
      dateFrom,
      dateTo,
    });
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
