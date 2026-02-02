import { PricingModel } from "@/types/constants";
import { prisma } from "@/lib/prisma/client";

const SUBSCRIPTION_DAYS = 30;

export async function linkReceiptToEntitlement(
	sessionToken: string,
	receipt: string
): Promise<void> {
	if (!sessionToken || !receipt) {
		throw new Error("sessionToken and receipt are required");
	}

	const attempt = await prisma.installAttempt.findUnique({
		where: { sessionToken },
	});
	if (!attempt) {
		throw new Error("Unknown install session");
	}

	const project = await prisma.project.findUnique({
		where: { id: attempt.projectId },
	});
	if (!project) {
		throw new Error("Project not found");
	}

	const pricingModel = project.pricingModel as PricingModel;
	const rule = await prisma.pricingRule.findFirst({
		where: { projectId: project.id, model: pricingModel },
	});

	const existingReceipt = await prisma.receipt.findUnique({
		where: { token: receipt },
	});
	if (existingReceipt && existingReceipt.projectId !== project.id) {
		throw new Error("Receipt already used for a different project");
	}

	if (!existingReceipt) {
		await prisma.receipt.create({
			data: {
				projectId: project.id,
				token: receipt,
				amount: rule?.amount ?? 0,
			},
		});
	}

	const entitlementData = buildEntitlementData(
		pricingModel,
		attempt.deviceId,
		project.id
	);

	if (entitlementData) {
		await prisma.entitlement.create({ data: entitlementData });
	}

	await prisma.installAttempt.update({
		where: { id: attempt.id },
		data: { status: "allowed" },
	});
}

function buildEntitlementData(
	pricingModel: PricingModel,
	deviceId: string | null | undefined,
	projectId: string
) {
	if (pricingModel === "subscription") {
		if (!deviceId) {
			throw new Error("Device is required for subscription entitlements");
		}
		return {
			projectId,
			deviceId,
			expiresAt: new Date(
				Date.now() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000
			),
		};
	}
	if (pricingModel === "per_device") {
		if (!deviceId) {
			throw new Error("Device is required for per_device entitlements");
		}
		return { projectId, deviceId };
	}
	return null;
}
