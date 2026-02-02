import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireWalletAddressFromHeaders } from "@/lib/auth/wallet-auth";
import type { InstallLogEntry } from "@/types/logs";

function mapStatusToEventType(status: string): InstallLogEntry["eventType"] {
	switch (status) {
		case "payment_required":
			return "payment_required_x402";
		case "allowed":
			return "install_success";
		default:
			return "install_attempt";
	}
}

export async function GET(request: NextRequest) {
	try {
		const walletAddress = requireWalletAddressFromHeaders(request);
		const { searchParams } = new URL(request.url);
		const projectId = searchParams.get("projectId") ?? undefined;
		const limit = Math.min(
			parseInt(searchParams.get("limit") ?? "50", 10) || 50,
			100,
		);
		const cursor = searchParams.get("cursor") ?? undefined;

		const developer = await prisma.developer.findUnique({
			where: { walletAddress: walletAddress.toLowerCase() },
		});

		if (!developer) {
			return NextResponse.json({ logs: [], nextCursor: null });
		}

		const projectFilter =
			projectId !== undefined
				? { projectId, project: { developerId: developer.id } }
				: { project: { developerId: developer.id } };

		const attempts = await prisma.installAttempt.findMany({
			where: projectFilter,
			include: {
				project: {
					select: {
						id: true,
						name: true,
						pricingRules: { orderBy: { id: "asc" }, take: 1 },
					},
				},
			},
			orderBy: { createdAt: "desc" },
			take: limit + 1,
			...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
		});

		const hasMore = attempts.length > limit;
		const items = hasMore ? attempts.slice(0, limit) : attempts;
		const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

		const logs: InstallLogEntry[] = items.map((a) => {
			const paidAmount =
				a.status === "allowed"
					? a.project.pricingRules[0]?.amount ?? null
					: null;
			return {
				id: a.id,
				timestamp: a.createdAt.toISOString(),
				packageName: a.project.name,
				eventType: mapStatusToEventType(a.status),
				amount: paidAmount,
				status: a.status === "allowed" ? "success" : "failed",
				projectId: a.projectId,
			};
		});

		return NextResponse.json({ logs, nextCursor });
	} catch (error) {
		return NextResponse.json(
			{ error: (error as Error).message },
			{ status: 400 },
		);
	}
}
