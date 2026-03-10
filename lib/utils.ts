import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PricingModel } from "@/types/constants";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/** Human-readable label for a pricing model. */
export function pricingModelLabel(model: PricingModel): string {
	const labels: Record<PricingModel, string> = {
		per_device: "Per device",
		subscription: "Subscription",
		per_user: "Per user",
	};
	return labels[model] ?? model;
}

/** Human-readable label for payment type (where payments are received: Base, Sui, Starknet). */
export function paymentTypeLabel(receiveMode: string | null | undefined): string {
	const mode = receiveMode ?? "base";
	const labels: Record<string, string> = {
		base: "Base",
		sui: "Sui",
		starknet: "Starknet",
	};
	return labels[mode] ?? mode;
}

/** Shorten an address for display (e.g. 0x1234...5678). */
export function shortenAddress(address: string, head = 6, tail = 4): string {
	if (!address || address.length <= head + tail) return address;
	return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

/** Format ISO date string for display. */
export function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}
