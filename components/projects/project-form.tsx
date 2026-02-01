"use client";

import { PricingModel } from "@/types/constants";
import { ProjectSummary } from "@/types/projects";

const pricingOptions: PricingModel[] = [
	"one_time",
	"subscription",
	"per_device",
	"per_version",
];

export function ProjectForm(props: {
	name: string;
	price: string;
	paymentAddress: string;
	pricingModel: PricingModel;
	onNameChange: (value: string) => void;
	onPriceChange: (value: string) => void;
	onPaymentAddressChange: (value: string) => void;
	onPricingChange: (value: PricingModel) => void;
	onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
	return (
		<form
			className="space-y-3 rounded border p-4"
			onSubmit={props.onSubmit}
		>
			<div className="flex flex-col gap-1">
				<label className="text-sm font-medium">Project name</label>
				<input
					className="rounded border px-3 py-2"
					value={props.name}
					onChange={(event) => props.onNameChange(event.target.value)}
					required
				/>
			</div>
			<div className="flex flex-col gap-1">
				<label className="text-sm font-medium">Price</label>
				<input
					className="rounded border px-3 py-2"
					type="number"
					min="0"
					step="1"
					value={props.price}
					onChange={(event) =>
						props.onPriceChange(event.target.value)
					}
					required
				/>
			</div>
			<div className="flex flex-col gap-1">
				<label className="text-sm font-medium">
					Payment address (Base USDC)
				</label>
				<input
					className="rounded border px-3 py-2"
					value={props.paymentAddress}
					onChange={(event) =>
						props.onPaymentAddressChange(event.target.value)
					}
					required
				/>
			</div>
			<div className="flex flex-col gap-1">
				<label className="text-sm font-medium">Pricing model</label>
				<select
					className="rounded border px-3 py-2"
					value={props.pricingModel}
					onChange={(event) =>
						props.onPricingChange(
							event.target.value as PricingModel,
						)
					}
				>
					{pricingOptions.map((option) => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
			</div>
			<button
				type="submit"
				className="rounded bg-black px-4 py-2 text-white"
				aria-label="create-project"
			>
				Create project
			</button>
		</form>
	);
}

export function ProjectList(props: {
	projects: ProjectSummary[];
	onRotate: (projectId: string) => Promise<void>;
}) {
	if (!props.projects.length) {
		return <p className="text-sm text-neutral-600">No projects yet.</p>;
	}

	return (
		<div className="space-y-3">
			{props.projects.map((project) => (
				<div
					key={project.id}
					className="flex flex-col gap-2 rounded border p-4"
				>
					<div className="flex items-center justify-between">
						<div className="flex-1 space-y-2">
							<p className="text-sm font-semibold">
								{project.name}
							</p>
							<p className="text-xs text-neutral-600">
								{project.pricingModel} • Price:{" "}
								{project.price ?? 0}
							</p>
							<p className="text-xs text-neutral-600 break-all">
								Address: {project.paymentAddress ?? "not set"}
							</p>
							<div className="mt-3 space-y-1 rounded border bg-neutral-50 p-3">
								<p className="text-xs font-medium text-neutral-900">
									Add to your .env file:
								</p>
								<p className="text-xs text-neutral-700 break-all font-mono">
									PAYGATE_PROJECT_ID=&quot;{project.id}&quot;
								</p>
								{project.apiKeyValue ? (
									<p className="text-xs text-neutral-700 break-all font-mono">
										PAYGATE_API_KEY=&quot;{project.apiKeyValue}&quot;
									</p>
								) : null}
							</div>
						</div>
						<button
							className="rounded border px-3 py-1 text-sm"
							onClick={() => props.onRotate(project.id)}
						>
							Rotate API key
						</button>
					</div>
				</div>
			))}
		</div>
	);
}
