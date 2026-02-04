import { z } from "zod";
import type { PricingModel } from "./constants";

const pricingModelSchema = z.enum([
	"per_device",
	"subscription",
] as const satisfies readonly PricingModel[]);

export const projectCreateSchema = z.object({
	name: z.string().min(1),
	pricingModel: pricingModelSchema,
	price: z.number().min(0),
	paymentAddress: z.string().min(1),
});

export const projectRotateSchema = z.object({
	projectId: z.string().min(1),
});

export const projectUpdateSchema = z.object({
	projectId: z.string().min(1),
	paymentAddress: z.string().min(1),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectRotateInput = z.infer<typeof projectRotateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

export const billingSchema = z.object({
	projectId: z.string().min(1),
});
export type BillingSchema = z.infer<typeof billingSchema>;

// --- Install flow (x402) ---
/** projectId + apiKey required; deviceId/version optional per pricing model */
const installAuthSchema = z.object({
	projectId: z.coerce.string().trim().min(1).max(64),
	apiKey: z.coerce.string().trim().min(1).max(256),
});

/** Coerce optional string fields so numbers/empty from client don't fail validation */
const optionalString = (maxLen: number) =>
	z.union([z.string(), z.number()]).optional().transform((v) =>
		v === undefined || v === null ? undefined : String(v).trim() || undefined
	).pipe(z.string().max(maxLen).optional());

export const installStartSchema = installAuthSchema.extend({
	deviceId: optionalString(256),
	githubUserId: optionalString(64),
	githubUsername: optionalString(256),
	version: z
		.union([z.string(), z.number()])
		.optional()
		.transform((v) => (v === undefined || v === null ? "0.0.0" : String(v)))
		.pipe(z.string().max(64)),
});
export type InstallStartInput = z.infer<typeof installStartSchema>;

export const installStatusSchema = installAuthSchema.extend({
	deviceId: z.string().max(256).optional(),
	githubUserId: z.string().max(64).optional(),
	githubUsername: z.string().max(256).optional(),
	version: z.string().max(64).optional(),
	sessionToken: z.string().min(1).max(256).optional(),
});
export type InstallStatusInput = z.infer<typeof installStatusSchema>;

export const installConfirmSchema = z.object({
	projectId: z.string().min(1).max(64),
	apiKey: z.string().min(1).max(256),
	sessionToken: z.string().min(1).max(256),
});
export type InstallConfirmInput = z.infer<typeof installConfirmSchema>;

/** Verify payment: sessionToken + transactionHash from client */
export const installVerifySchema = z.object({
	sessionToken: z.string().min(1).max(256),
	transactionHash: z.string().min(1).max(132),
});
export type InstallVerifyInput = z.infer<typeof installVerifySchema>;
