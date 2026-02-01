"use client";

import { useState } from "react";
import { PricingModel } from "@/types/constants";
import { ProjectForm } from "@/components/projects/project-form";
import { useWalletAddress } from "@/lib/auth/use-wallet-address";

export default function ProjectsPage() {
	const form = useProjectForm();

	return (
			<main className="p-6 space-y-6">
			<header>
				<h1 className="text-2xl font-semibold">Projects</h1>
				<p className="mt-2 text-sm text-neutral-600">
					Create projects, set pricing models, and rotate API keys.
				</p>
			</header>
			<ProjectForm
				name={form.name}
				price={form.price}
				paymentAddress={form.paymentAddress}
				pricingModel={form.pricingModel}
				onNameChange={form.setName}
				onPriceChange={form.setPrice}
				onPaymentAddressChange={form.setPaymentAddress}
				onPricingChange={form.setPricingModel}
				onSubmit={form.handleCreate}
			/>
			{form.message ? (
				<p
					className="text-sm text-blue-700"
					data-testid="projects-message"
				>
					{form.message}
				</p>
			) : null}
			</main>
	);
}

function useProjectForm() {
	const [name, setName] = useState("");
	const [price, setPrice] = useState("10");
	const [paymentAddress, setPaymentAddress] = useState("");
	const [pricingModel, setPricingModel] = useState<PricingModel>("one_time");
	const [message, setMessage] = useState("");
	const walletAddress = useWalletAddress();

	const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!walletAddress) {
			setMessage("Please connect your wallet first");
			return;
		}
		await submitProject(
			{ name, pricingModel, price, paymentAddress },
			{ setName, setPrice, setPaymentAddress, setMessage },
			walletAddress
		);
	};

	return {
		name,
		price,
		paymentAddress,
		pricingModel,
		message,
		setName,
		setPrice,
		setPaymentAddress,
		setPricingModel,
		handleCreate,
	};
}

async function submitProject(
	data: {
		name: string;
		pricingModel: PricingModel;
		price: string;
		paymentAddress: string;
	},
	handlers: {
		setName: (value: string) => void;
		setPrice: (value: string) => void;
		setPaymentAddress: (value: string) => void;
		setMessage: (value: string) => void;
	},
	walletAddress: string
) {
	handlers.setMessage("");
	const res = await fetch("/api/projects", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-wallet-address": walletAddress,
		},
		body: JSON.stringify({
			name: data.name,
			pricingModel: data.pricingModel,
			price: Number(data.price),
			paymentAddress: data.paymentAddress,
		}),
	});
	if (res.ok) {
		handlers.setName("");
		handlers.setPrice("10");
		handlers.setPaymentAddress("");
		handlers.setMessage("Project created and API key issued.");
		return;
	}
	const error = await res.json();
	handlers.setMessage(error.error ?? "Unable to create project.");
}

