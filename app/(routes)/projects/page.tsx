"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PricingModel } from "@/types/constants";
import type { ProjectSummary } from "@/types/projects";
import { ProjectForm } from "@/components/projects/project-form";
import { ProjectCard } from "@/components/projects/project-card";
import { NewProjectCard } from "@/components/projects/new-project-card";
import { useWalletAddress } from "@/lib/auth/use-wallet-address";
import { useProjectsQuery } from "@/controllers/projects.query";
import { useCreateProjectMutation } from "@/controllers/projects.mutations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export default function ProjectsPage() {
	const router = useRouter();
	const walletAddress = useWalletAddress();
	const [addOpen, setAddOpen] = useState(false);
	const [addMessage, setAddMessage] = useState("");
	const [addName, setAddName] = useState("");
	const [addPrice, setAddPrice] = useState("0.1");
	const [addPaymentAddress, setAddPaymentAddress] = useState("");
	const [addPricingModel, setAddPricingModel] =
		useState<PricingModel>("per_device");

	const {
		data: projectsData,
		isLoading: loading,
		error: projectsError,
	} = useProjectsQuery(walletAddress ?? undefined);

	const createProject = useCreateProjectMutation(walletAddress ?? undefined, {
		onSuccess: (project) => {
			setAddOpen(false);
			setAddName("");
			setAddPrice("0.1");
			setAddPaymentAddress("");
			setAddPricingModel("per_device");
			router.push(`/projects/${project.id}`);
		},
		onError: (err) => {
			setAddMessage(err.message ?? "Unable to create project.");
		},
	});

	const projects: ProjectSummary[] = projectsData?.projects ?? [];
	const error = projectsError?.message ?? null;

	const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!walletAddress) return;
		setAddMessage("");
		createProject.mutate({
			name: addName,
			pricingModel: addPricingModel,
			price: Number(addPrice),
			paymentAddress: addPaymentAddress,
			receiveMode: "base",
		});
	};

	return (
		<main className="p-6 space-y-6 bg-linear-to-b from-white to-purple-50/30 min-h-full">
			<header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-gray-900">Projects</h1>
					<p className="mt-1 text-sm text-gray-600">
						Manage your packages, set pricing, and manage API keys.
					</p>
				</div>
				{walletAddress && (
					<Dialog open={addOpen} onOpenChange={setAddOpen}>
						<Button onClick={() => setAddOpen(true)}>
							<Plus className="size-4" />
							Add project
						</Button>
						<DialogContent className="sm:max-w-md">
							<DialogHeader>
								<DialogTitle>Create project</DialogTitle>
							</DialogHeader>
							<ProjectForm
								name={addName}
								price={addPrice}
								paymentAddress={addPaymentAddress}
								pricingModel={addPricingModel}
								onNameChange={setAddName}
								onPriceChange={setAddPrice}
								onPaymentAddressChange={setAddPaymentAddress}
								onPricingChange={setAddPricingModel}
								onSubmit={handleAddSubmit}
							/>
							{addMessage ? (
								<p
									className="text-sm text-destructive"
									data-testid="projects-message"
								>
									{addMessage}
								</p>
							) : null}
							{createProject.isPending && (
								<p className="text-sm text-muted-foreground">
									Creating…
								</p>
							)}
						</DialogContent>
					</Dialog>
				)}
			</header>

			<section>
				{!walletAddress ? (
					<p className="text-sm text-muted-foreground">
						Connect your wallet to see and manage projects.
					</p>
				) : loading ? (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<Card
								key={i}
								className="overflow-hidden rounded-xl border border-border/80 animate-pulse"
							>
								<div className="flex flex-row items-start gap-3 p-4 pb-2">
									<div className="size-10 rounded-lg bg-muted" />
									<div className="flex-1 space-y-2">
										<div className="h-4 w-3/4 rounded bg-muted" />
										<div className="h-3 w-1/2 rounded bg-muted" />
									</div>
								</div>
								<div className="space-y-2 px-4 pb-4">
									<div className="h-3 w-1/3 rounded bg-muted" />
									<div className="h-7 w-full rounded bg-muted" />
								</div>
							</Card>
						))}
					</div>
				) : error ? (
					<p className="text-sm text-destructive">{error}</p>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{projects.map((project) => (
							<ProjectCard key={project.id} project={project} />
						))}
						{walletAddress && (
							<NewProjectCard onClick={() => setAddOpen(true)} />
						)}
					</div>
				)}
			</section>
		</main>
	);
}
