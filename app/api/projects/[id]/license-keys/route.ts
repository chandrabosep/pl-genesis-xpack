import { NextRequest, NextResponse } from "next/server";
import { getProjectById } from "@/lib/x402/project-service";
import { requireWalletAddressFromHeaders } from "@/lib/auth/wallet-auth";
import { prisma } from "@/lib/prisma/client";
import { z } from "zod";

const createBodySchema = z.object({
	label: z.string().max(128).optional(),
});

/** Generate a secure random license key (32 bytes hex). */
function generateLicenseKey(): string {
	const bytes = new Uint8Array(32);
	if (typeof crypto !== "undefined" && crypto.getRandomValues) {
		crypto.getRandomValues(bytes);
	} else {
		for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256);
	}
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** GET: list license keys for the project (values masked). */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const walletAddress = requireWalletAddressFromHeaders(request);
		const { id: projectId } = await params;
		const project = await getProjectById(projectId, walletAddress);
		if (!project) {
			return NextResponse.json(
				{ error: "Project not found" },
				{ status: 404 },
			);
		}
		const keys = await prisma.licenseKey.findMany({
			where: { projectId },
			orderBy: { createdAt: "desc" },
			select: { id: true, label: true, createdAt: true },
		});
		return NextResponse.json({ licenseKeys: keys });
	} catch (error) {
		return NextResponse.json(
			{ error: (error as Error).message },
			{ status: 400 },
		);
	}
}

/** POST: create a new license key. Value is returned only in this response. */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const walletAddress = requireWalletAddressFromHeaders(request);
		const { id: projectId } = await params;
		const project = await getProjectById(projectId, walletAddress);
		if (!project) {
			return NextResponse.json(
				{ error: "Project not found" },
				{ status: 404 },
			);
		}
		let body: unknown;
		try {
			body = await request.json();
		} catch {
			body = {};
		}
		const { label } = createBodySchema.parse(body);
		const value = generateLicenseKey();
		const created = await prisma.licenseKey.create({
			data: {
				projectId,
				value,
				label: label ?? null,
			},
		});
		return NextResponse.json({
			id: created.id,
			label: created.label,
			createdAt: created.createdAt.toISOString(),
			/** Shown only once; use as XPACK_LICENSE_KEY in CI or xpack.licenseKey. */
			value,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			const first = error.errors[0];
			const msg = first
				? `${first.path.join(".")}: ${first.message}`
				: "Validation failed";
			return NextResponse.json({ error: msg }, { status: 400 });
		}
		return NextResponse.json(
			{ error: (error as Error).message },
			{ status: 400 },
		);
	}
}
