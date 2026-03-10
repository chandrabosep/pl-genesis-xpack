import { prisma } from "@/lib/prisma/client";
import type { ProjectSummary } from "@/types/projects";
import type { ProjectCreateInput } from "@/types/schemas";
import type { PricingModel } from "@/types/constants";

export async function listProjects(walletAddress: string): Promise<ProjectSummary[]> {
	const developer = await prisma.developer.findUnique({
		where: { walletAddress: walletAddress.toLowerCase() },
		include: {
			projects: {
				include: {
					apiKeys: {
						orderBy: { createdAt: "desc" },
						take: 1,
					},
					pricingRules: {
						orderBy: { id: "asc" },
						take: 1,
					},
				},
			},
		},
	});

	if (!developer) {
		return [];
	}

	return developer.projects.map((p) => ({
		id: p.id,
		name: p.name,
		pricingModel: p.pricingModel as PricingModel,
		paymentAddress: p.paymentAddress,
		price: p.pricingRules[0]?.amount ?? null,
		apiKeyValue: p.apiKeys[0]?.value ?? null,
		createdAt: p.createdAt.toISOString(),
		receiveMode: p.receiveMode ?? null,
		unifiedReceiveAddress: p.unifiedReceiveAddress ?? null,
		suiAddress: p.suiAddress ?? null,
		starknetAddress: (p as { starknetAddress?: string | null }).starknetAddress ?? null,
	}));
}

export async function getProjectById(
	projectId: string,
	walletAddress: string
): Promise<ProjectSummary | null> {
	const normalized = walletAddress.toLowerCase();

	const developer = await prisma.developer.findUnique({
		where: { walletAddress: normalized },
	});

	if (!developer) {
		return null;
	}

	const project = await prisma.project.findFirst({
		where: { id: projectId, developerId: developer.id },
		include: {
			apiKeys: {
				orderBy: { createdAt: "desc" },
				take: 1,
			},
			pricingRules: {
				orderBy: { id: "asc" },
				take: 1,
			},
		},
	});

	if (!project) {
		return null;
	}

	return {
		id: project.id,
		name: project.name,
		pricingModel: project.pricingModel as PricingModel,
		paymentAddress: project.paymentAddress,
		price: project.pricingRules[0]?.amount ?? null,
		apiKeyValue: project.apiKeys[0]?.value ?? null,
		createdAt: project.createdAt.toISOString(),
		receiveMode: project.receiveMode ?? null,
		unifiedReceiveAddress: project.unifiedReceiveAddress ?? null,
		suiAddress: project.suiAddress ?? null,
		starknetAddress: (project as { starknetAddress?: string | null }).starknetAddress ?? null,
	};
}

export async function createProject(
	body: ProjectCreateInput,
	walletAddress: string
) {
	const normalized = walletAddress.toLowerCase();

	const developer = await prisma.developer.upsert({
		where: { walletAddress: normalized },
		create: { walletAddress: normalized },
		update: {},
	});

	const isNonEvm = body.receiveMode === "sui" || body.receiveMode === "starknet";
	const paymentAddress =
		isNonEvm && !body.paymentAddress?.trim()
			? "0x0000000000000000000000000000000000000000"
			: (body.paymentAddress ?? "").trim();

	const project = await prisma.project.create({
		data: {
			name: body.name,
			pricingModel: body.pricingModel,
			paymentAddress: paymentAddress || "0x0000000000000000000000000000000000000000",
			receiveMode: body.receiveMode ?? "base",
			unifiedReceiveAddress: body.unifiedReceiveAddress?.trim() || null,
			suiAddress: body.suiAddress?.trim() || null,
			// Prisma client types may lag behind schema changes in this repo; cast for compatibility.
			starknetAddress: (body as { starknetAddress?: string }).starknetAddress?.trim() || null,
			developerId: developer.id,
		} as unknown as Parameters<typeof prisma.project.create>[0]["data"],
	});

	await prisma.pricingRule.create({
		data: {
			projectId: project.id,
			model: body.pricingModel,
			amount: body.price,
		},
	});

	const apiKey = await prisma.apiKey.create({
		data: {
			projectId: project.id,
			developerId: developer.id,
			value: `pay_${crypto.randomUUID().replace(/-/g, "")}`,
		},
	});

	return {
		...project,
		apiKeyId: apiKey.id,
		apiKeyValue: apiKey.value,
	};
}

export async function rotateApiKey(projectId: string, walletAddress: string) {
	const normalized = walletAddress.toLowerCase();

	const developer = await prisma.developer.findUnique({
		where: { walletAddress: normalized },
	});

	if (!developer) {
		throw new Error("Developer not found");
	}

	const project = await prisma.project.findFirst({
		where: { id: projectId, developerId: developer.id },
	});

	if (!project) {
		throw new Error("Project not found");
	}

	const [currentKey] = await prisma.apiKey.findMany({
		where: { projectId, developerId: developer.id },
		orderBy: { createdAt: "desc" },
		take: 1,
	});

	if (currentKey) {
		await prisma.apiKey.update({
			where: { id: currentKey.id },
			data: { rotatedAt: new Date() },
		});
	}

	const newKey = await prisma.apiKey.create({
		data: {
			projectId: project.id,
			developerId: developer.id,
			value: `pay_${crypto.randomUUID().replace(/-/g, "")}`,
		},
	});

	return { id: newKey.id, value: newKey.value };
}

export type UpdateProjectParams = {
	paymentAddress?: string;
	receiveMode?: "base" | "sui" | "starknet";
	unifiedReceiveAddress?: string | null;
	suiAddress?: string | null;
	starknetAddress?: string | null;
};

export async function updateProject(
	projectId: string,
	updates: UpdateProjectParams,
	walletAddress: string
) {
	const normalized = walletAddress.toLowerCase();

	const developer = await prisma.developer.findUnique({
		where: { walletAddress: normalized },
	});

	if (!developer) {
		throw new Error("Developer not found");
	}

	const project = await prisma.project.findFirst({
		where: { id: projectId, developerId: developer.id },
	});

	if (!project) {
		throw new Error("Project not found");
	}

	const data: {
		paymentAddress?: string;
		receiveMode?: string;
		unifiedReceiveAddress?: string | null;
		suiAddress?: string | null;
		starknetAddress?: string | null;
	} = {};
	if (updates.paymentAddress !== undefined) data.paymentAddress = updates.paymentAddress;
	if (updates.receiveMode !== undefined) data.receiveMode = updates.receiveMode;
	if (updates.unifiedReceiveAddress !== undefined) data.unifiedReceiveAddress = updates.unifiedReceiveAddress?.trim() || null;
	if (updates.suiAddress !== undefined) data.suiAddress = updates.suiAddress?.trim() || null;
	if (updates.starknetAddress !== undefined) data.starknetAddress = updates.starknetAddress?.trim() || null;

	await prisma.project.update({
		where: { id: projectId },
		data: data as unknown as Parameters<typeof prisma.project.update>[0]["data"],
	});

	return { id: projectId, ...data };
}

export async function deleteProject(projectId: string, walletAddress: string) {
	const normalized = walletAddress.toLowerCase();

	const developer = await prisma.developer.findUnique({
		where: { walletAddress: normalized },
	});

	if (!developer) {
		throw new Error("Developer not found");
	}

	const project = await prisma.project.findFirst({
		where: { id: projectId, developerId: developer.id },
	});

	if (!project) {
		throw new Error("Project not found");
	}

	await prisma.apiKey.deleteMany({ where: { projectId } });
	await prisma.pricingRule.deleteMany({ where: { projectId } });
	await prisma.receipt.deleteMany({ where: { projectId } });
	await prisma.entitlement.deleteMany({ where: { projectId } });
	await prisma.device.deleteMany({ where: { projectId } });
	await prisma.installAttempt.deleteMany({ where: { projectId } });
	await prisma.project.delete({ where: { id: projectId } });

	return { id: projectId };
}
