import { prisma } from "@/lib/prisma/client";
import type { PricingModel } from "@/types/constants";
import type {
	InstallStartInput,
	InstallStatusInput,
	InstallConfirmInput,
} from "@/types/schemas";

/** Result of install decision: allowed or payment required with details */
export type InstallDecision =
	| { allowed: true }
	| {
			allowed: false;
			reason: string;
			payment: {
				price: number;
				address: string;
				sessionToken: string;
				instructions: string;
			};
	  };

/** Base URL for payment instructions (e.g. https://yourapp.com). No trailing slash. */
function paymentInstructionsBaseUrl(): string {
	const url = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
	if (url && typeof url === "string") {
		const trimmed = url.trim().replace(/\/$/, "");
		if (trimmed.length > 0) return trimmed;
	}
	return "https://example.com";
}

/** Generate a cryptographically secure session token for an install attempt */
function generateSessionToken(): string {
	const bytes = new Uint8Array(32);
	if (typeof crypto !== "undefined" && crypto.getRandomValues) {
		crypto.getRandomValues(bytes);
	} else {
		// Fallback for older runtimes
		for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256);
	}
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validate that the given apiKey belongs to the given projectId.
 * Returns project with pricing rules and first matching apiKey, or null.
 * Isolates access: callers can only operate on the project that owns the key.
 */
async function validateProjectApiKey(projectId: string, apiKey: string) {
	const key = await prisma.apiKey.findFirst({
		where: {
			projectId,
			value: apiKey,
		},
		include: {
			project: {
				include: {
					pricingRules: { orderBy: { id: "asc" }, take: 1 },
				},
			},
		},
	});
	if (!key?.project) return null;
	return { project: key.project, apiKey: key };
}

/** Check if user is already entitled: per_device by deviceId, subscription by githubUserId or githubUsername */
async function hasEntitlement(
	projectId: string,
	pricingModel: PricingModel,
	deviceId: string | undefined,
	githubUserId: string | undefined,
	githubUsername: string | undefined,
): Promise<boolean> {
	if (pricingModel === "subscription" && (githubUserId || githubUsername)) {
		const count = await prisma.entitlement.count({
			where: {
				projectId,
				expiresAt: { gt: new Date() },
				OR: [
					...(githubUserId ? [{ githubUserId }] : []),
					...(githubUsername ? [{ githubUsername }] : []),
				],
			},
		});
		return count > 0;
	}
	if (pricingModel === "per_device" && deviceId) {
		const count = await prisma.entitlement.count({
			where: { projectId, deviceId },
		});
		return count > 0;
	}
	return false;
}

/** Build payment_required decision from project and session token. Optional githubUsername is appended to pay URL for pre-fill. */
function paymentRequired(
	project: { paymentAddress: string; pricingRules: { amount: number }[] },
	sessionToken: string,
	githubUsername?: string | null
): InstallDecision {
	const price = project.pricingRules[0]?.amount ?? 0;
	const base = paymentInstructionsBaseUrl();
	let instructions = `${base}/pay?session=${encodeURIComponent(sessionToken)}`;
	if (githubUsername?.trim()) {
		instructions += `&github=${encodeURIComponent(githubUsername.trim())}`;
	}
	return {
		allowed: false,
		reason: "Payment required to install this package",
		payment: {
			price,
			address: project.paymentAddress,
			sessionToken,
			instructions,
		},
	};
}

/**
 * Start install flow: validate apiKey/projectId, check entitlement, or create attempt and return payment details.
 * Per-device: requires deviceId. Subscription: requires githubUserId (device-agnostic, keyed by GitHub identity).
 */
export async function startInstall(body: InstallStartInput): Promise<InstallDecision> {
	const validated = await validateProjectApiKey(body.projectId, body.apiKey);
	if (!validated) {
		return {
			allowed: false,
			reason: "Invalid project or API key",
			payment: {
				price: 0,
				address: "",
				sessionToken: "",
				instructions: "",
			},
		};
	}

	const { project } = validated;
	const pricingModel = project.pricingModel as PricingModel;
	const deviceId = body.deviceId ?? undefined;
	const githubUserId = body.githubUserId ?? undefined;
	const githubUsername = body.githubUsername ?? undefined;
	const version = body.version ?? "0.0.0";

	// Subscription: payment URL is always returned when not entitled; GitHub can be set on payment page if missing.
	if (pricingModel === "per_device" && !deviceId) {
		return {
			allowed: false,
			reason: "Device ID is required for per-device licensing",
			payment: {
				price: 0,
				address: "",
				sessionToken: "",
				instructions: "",
			},
		};
	}

	const entitled = await hasEntitlement(
		project.id,
		pricingModel,
		deviceId,
		githubUserId,
		githubUsername,
	);
	if (entitled) return { allowed: true };

	const sessionToken = generateSessionToken();
	await prisma.installAttempt.create({
		data: {
			projectId: project.id,
			deviceId: deviceId ?? null,
			githubUserId: githubUserId ?? null,
			githubUsername: githubUsername ?? null,
			version,
			status: "payment_required",
			sessionToken,
		},
	});

	return paymentRequired(project, sessionToken, githubUsername);
}

/**
 * Check install status: validate apiKey/projectId; if sessionToken provided, verify it belongs to this project and check status.
 * Isolation: sessionToken is only accepted when attempt.projectId === body.projectId.
 */
export async function checkInstallStatus(
	body: InstallStatusInput
): Promise<InstallDecision> {
	const validated = await validateProjectApiKey(body.projectId, body.apiKey);
	if (!validated) {
		return {
			allowed: false,
			reason: "Invalid project or API key",
			payment: {
				price: 0,
				address: "",
				sessionToken: "",
				instructions: "",
			},
		};
	}

	const { project } = validated;
	const pricingModel = project.pricingModel as PricingModel;
	const deviceId = body.deviceId ?? undefined;
	const githubUserId = body.githubUserId ?? undefined;
	const githubUsername = body.githubUsername ?? undefined;
	const version = body.version ?? "0.0.0";

	// Subscription: payment URL is always returned when not entitled; GitHub can be set on payment page if missing.
	if (pricingModel === "per_device" && !deviceId) {
		return {
			allowed: false,
			reason: "Device ID is required for per-device licensing",
			payment: {
				price: 0,
				address: "",
				sessionToken: "",
				instructions: "",
			},
		};
	}

	if (body.sessionToken) {
		const attempt = await prisma.installAttempt.findUnique({
			where: { sessionToken: body.sessionToken },
			select: { projectId: true, status: true },
		});
		// Session must belong to this project; otherwise ignore and fall through
		if (attempt && attempt.projectId === body.projectId) {
			if (attempt.status === "allowed") return { allowed: true };
			return paymentRequired(project, body.sessionToken, githubUsername);
		}
	}

	const entitled = await hasEntitlement(
		project.id,
		pricingModel,
		deviceId,
		githubUserId,
		githubUsername,
	);
	if (entitled) return { allowed: true };

	const sessionToken = generateSessionToken();
	await prisma.installAttempt.create({
		data: {
			projectId: project.id,
			deviceId: deviceId ?? null,
			githubUserId: githubUserId ?? null,
			githubUsername: githubUsername ?? null,
			version,
			status: "payment_required",
			sessionToken,
		},
	});

	return paymentRequired(project, sessionToken, githubUsername);
}

/**
 * Confirm install: validate apiKey/projectId and sessionToken; session must belong to this project.
 * Returns allowed only if the attempt for this project has status "allowed".
 * Isolation: sessionToken is only valid when attempt.projectId === body.projectId.
 */
export async function confirmInstall(
	body: InstallConfirmInput
): Promise<InstallDecision> {
	const validated = await validateProjectApiKey(body.projectId, body.apiKey);
	if (!validated) {
		return {
			allowed: false,
			reason: "Invalid project or API key",
			payment: {
				price: 0,
				address: "",
				sessionToken: "",
				instructions: "",
			},
		};
	}

	const attempt = await prisma.installAttempt.findUnique({
		where: { sessionToken: body.sessionToken },
		select: { projectId: true, status: true },
	});

	if (!attempt || attempt.projectId !== body.projectId) {
		return {
			allowed: false,
			reason: "Invalid or expired session",
			payment: {
				price: 0,
				address: "",
				sessionToken: "",
				instructions: "",
			},
		};
	}

	if (attempt.status === "allowed") return { allowed: true };

	return {
		allowed: false,
		reason: "Payment required",
		payment: {
			price: validated.project.pricingRules[0]?.amount ?? 0,
			address: validated.project.paymentAddress,
			sessionToken: body.sessionToken,
			instructions: `${paymentInstructionsBaseUrl()}/pay?session=${encodeURIComponent(body.sessionToken)}`,
		},
	};
}
