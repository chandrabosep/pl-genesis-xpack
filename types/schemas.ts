import { z } from "zod";
import type { PricingModel } from "./constants";

const pricingModelSchema = z.enum([
	"one_time",
	"subscription",
	"per_device",
	"per_version",
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

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectRotateInput = z.infer<typeof projectRotateSchema>;

export const billingSchema = z.object({
	projectId: z.string().min(1),
});
export type BillingSchema = z.infer<typeof billingSchema>;
