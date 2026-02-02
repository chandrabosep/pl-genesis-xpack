import { NextRequest, NextResponse } from "next/server";
import { getProjectById } from "@/lib/x402/project-service";
import { requireWalletAddressFromHeaders } from "@/lib/auth/wallet-auth";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const walletAddress = requireWalletAddressFromHeaders(request);
		const { id } = await params;
		const project = await getProjectById(id, walletAddress);
		if (!project) {
			return NextResponse.json(
				{ error: "Project not found" },
				{ status: 404 }
			);
		}
		return NextResponse.json(project);
	} catch (error) {
		return NextResponse.json(
			{ error: (error as Error).message },
			{ status: 400 }
		);
	}
}
