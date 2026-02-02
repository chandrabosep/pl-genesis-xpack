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

	const project = await prisma.project.create({
		data: {
			name: body.name,
			pricingModel: body.pricingModel,
			paymentAddress: body.paymentAddress,
			developerId: developer.id,
		},
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

export async function updateProject(
	projectId: string,
	paymentAddress: string,
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

	await prisma.project.update({
		where: { id: projectId },
		data: { paymentAddress },
	});

	return { id: projectId, paymentAddress };
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
