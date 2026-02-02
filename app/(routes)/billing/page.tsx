"use client";

import { useState } from "react";
import { useWalletAddress } from "@/lib/auth/use-wallet-address";

export default function BillingPage() {
	const billing = useBilling();

	return (
			<main className="p-6 space-y-4">
				<header>
					<h1 className="text-2xl font-semibold">Billing</h1>
					<p className="mt-2 text-sm text-neutral-600">
						View receipts, entitlements, and active subscriptions.
					</p>
				</header>

				<div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
					<p className="font-medium">Test / placeholder</p>
					<p className="mt-1 text-amber-800">
						This is sample text so you can see how content looks on the billing page.
						Enter a project ID below and click &quot;Load billing&quot; to fetch real data.
					</p>
				</div>

				<BillingForm
					projectId={billing.projectId}
					onProjectChange={billing.setProjectId}
					onSubmit={billing.loadBilling}
				/>

				<BillingSummary overview={billing.overview} />

				{billing.error ? (
					<p className="text-sm text-red-700">{billing.error}</p>
				) : null}
			</main>
	);
}

function useBilling() {
	const [projectId, setProjectId] = useState("");
	const [overview, setOverview] = useState<any>(null);
	const [error, setError] = useState("");
	const walletAddress = useWalletAddress();

	const loadBilling = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");

		if (!walletAddress) {
			setError("Please connect your wallet first");
			return;
		}

		const res = await fetch(`/api/billing?projectId=${projectId}`, {
			headers: {
				"x-wallet-address": walletAddress,
			},
		});
		if (res.ok) {
			const data = await res.json();
			setOverview(data);
			return;
		}
		const data = await res.json();
		setError(data.error ?? "Unable to load billing.");
	};

	return { projectId, setProjectId, overview, error, loadBilling };
}

function BillingForm(props: {
	projectId: string;
	onProjectChange: (value: string) => void;
	onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
	return (
		<form
			className="space-y-3 rounded border p-4"
			onSubmit={props.onSubmit}
		>
			<label className="flex flex-col gap-1 text-sm font-medium">
				Project ID
				<input
					className="rounded border px-3 py-2"
					value={props.projectId}
					onChange={(event) =>
						props.onProjectChange(event.target.value)
					}
					required
				/>
			</label>
			<button
				type="submit"
				className="rounded bg-black px-4 py-2 text-white"
			>
				Load billing
			</button>
		</form>
	);
}

function BillingSummary(props: { overview: any }) {
	if (!props.overview) {
		return null;
	}

	return (
		<div className="rounded border p-4">
			<p className="text-sm">Receipts: {props.overview.receipts}</p>
			<p className="text-sm">
				Entitlements: {props.overview.entitlements}
			</p>
			<p className="text-sm">
				Active subscriptions: {props.overview.activeSubscriptions}
			</p>
		</div>
	);
}
