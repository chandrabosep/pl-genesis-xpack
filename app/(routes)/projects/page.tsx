"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PricingModel } from "@/types/constants";
import type { ProjectSummary } from "@/types/projects";
import { ProjectForm } from "@/components/projects/project-form";
import { useWalletAddress } from "@/lib/auth/use-wallet-address";
import { shortenAddress, formatDate, pricingModelLabel } from "@/lib/utils";
import { CopyButton } from "@/components/ui/copy-button";
import { useProjectsQuery } from "@/controllers/projects.query";
import { useCreateProjectMutation } from "@/controllers/projects.mutations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ChevronRight, Package, Plus } from "lucide-react";

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
		});
	};

	return (
		<main className="p-6 space-y-6">
			<header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Projects</h1>
					<p className="mt-2 text-sm text-muted-foreground">
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
						{Array.from({ length: 3 }).map((_, i) => (
							<div
								key={i}
								className="block rounded-lg h-full border border-border bg-muted/50 p-4 animate-pulse"
							>
								<div className="flex flex-row items-center justify-between mb-2">
									<div className="h-4 w-1/2 bg-muted rounded"></div>
									<div className="h-4 w-4 bg-muted rounded-full"></div>
								</div>
								<div className="space-y-3 pt-2">
									<div className="flex gap-2">
										<div className="h-6 w-16 bg-muted rounded"></div>
										<div className="h-6 w-12 bg-muted rounded"></div>
									</div>
									<div className="space-y-2">
										<div className="h-3 w-5/6 bg-muted rounded"></div>
										<div className="h-3 w-2/3 bg-muted rounded"></div>
										<div className="h-3 w-1/2 bg-muted rounded"></div>
									</div>
								</div>
							</div>
						))}
					</div>
				) : error ? (
					<p className="text-sm text-destructive">{error}</p>
				) : projects.length === 0 ? (
					<div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
						<Package className="mx-auto size-10 text-muted-foreground" />
						<p className="mt-2 text-sm text-muted-foreground">
							No projects yet. Click Add project to get started.
						</p>
					</div>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{projects.map((project) => (
							<Link
								key={project.id}
								href={`/projects/${project.id}`}
								className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
							>
								<Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
									<CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
										<CardTitle className="text-base truncate">
											{project.name}
										</CardTitle>
										<ChevronRight className="size-4 shrink-0 text-muted-foreground" />
									</CardHeader>
									<CardContent className="space-y-3 pt-0">
										<div className="flex flex-wrap items-center gap-2">
											<Badge
												variant="secondary"
												className="text-xs"
											>
												{pricingModelLabel(
													project.pricingModel,
												)}
											</Badge>
											<span className="text-sm font-medium">
												{project.price != null
													? `${project.price} USDC`
													: "—"}
											</span>
										</div>
										<div className="text-xs text-muted-foreground space-y-1">
											<p>
												<span className="font-medium">
													Payment:
												</span>{" "}
												{shortenAddress(
													project.paymentAddress,
												)}
											</p>
											<p>
												<span className="font-medium">
													Project ID:
												</span>{" "}
												<span className="font-mono text-[11px]">
													{shortenAddress(
														project.id,
														8,
														6,
													)}
												</span>
											</p>
											<p>
												<span className="font-medium">
													Created:
												</span>{" "}
												{formatDate(project.createdAt)}
											</p>
										</div>
										{project.apiKeyValue && (
											<div
												className="flex items-center gap-2"
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
												}}
											>
												<code className="flex-1 truncate rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">
													{shortenAddress(
														project.apiKeyValue,
														10,
														6,
													)}
												</code>
												<CopyButton
													value={project.apiKeyValue}
													label="Copy API key"
													buttonText="Copy"
												/>
											</div>
										)}
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				)}
			</section>
		</main>
	);
}
