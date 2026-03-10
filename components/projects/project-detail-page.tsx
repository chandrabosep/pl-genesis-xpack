"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useWalletAddress } from "@/lib/auth/use-wallet-address";
import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useProjectByIdQuery } from "@/controllers/projects.query";
import {
	useUpdateProjectMutation,
	useRotateProjectKeyMutation,
	useDeleteProjectMutation,
} from "@/controllers/projects.mutations";
import { ProjectDetailHeader } from "./project-detail-header";
import { ProjectPackageInfoCard } from "./project-package-info-card";
import { ProjectPreinstallCard } from "./project-preinstall-card";

export interface ProjectDetailPageProps {
	/** Preinstall script content (from config/package/preinstall.js). */
	preinstallScript: string;
	/** App base URL for xpack host (e.g. https://yourapp.com). Used to pre-fill xpack config. */
	appHost?: string;
}

export function ProjectDetailPage({
	preinstallScript,
	appHost = "",
}: ProjectDetailPageProps) {
	const params = useParams();
	const router = useRouter();
	const id = typeof params.id === "string" ? params.id : "";
	const walletAddress = useWalletAddress();

	const [editingPaymentAddress, setEditingPaymentAddress] = useState(false);
	const [inlinePaymentAddress, setInlinePaymentAddress] = useState("");
	const [updateError, setUpdateError] = useState<string | null>(null);
	const [rotateConfirmOpen, setRotateConfirmOpen] = useState(false);
	const [removeOpen, setRemoveOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const {
		data: project,
		isLoading: loading,
		error: queryError,
		refetch,
	} = useProjectByIdQuery(walletAddress ?? undefined, id);

	const updateMutation = useUpdateProjectMutation(
		walletAddress ?? undefined,
		{
			onSuccess: () => {
				setEditingPaymentAddress(false);
			},
			onError: (err) => {
				setUpdateError(err.message);
			},
		},
	);

	const rotateMutation = useRotateProjectKeyMutation(
		walletAddress ?? undefined,
		{
			onSuccess: () => {
				setRotateConfirmOpen(false);
			},
			onError: (err) => {
				setError(err.message);
			},
		},
	);

	const deleteMutation = useDeleteProjectMutation(
		walletAddress ?? undefined,
		{
			onSuccess: () => {
				router.push("/projects");
			},
			onError: (err) => {
				setError(err.message);
			},
		},
	);

	// When appHost is empty (e.g. local dev), use current origin for xpack host
	const effectiveHost =
		appHost || (typeof window !== "undefined" ? window.location.origin : "");

	const handleUpdatePaymentAddress = (address: string) => {
		if (!id || !walletAddress || !address.trim()) return;
		setUpdateError(null);
		updateMutation.mutate({
			projectId: id,
			paymentAddress: address.trim(),
		});
	};

	const handleRotateKey = () => {
		if (!id || !walletAddress) return;
		setRotateConfirmOpen(false);
		setError(null);
		rotateMutation.mutate({ projectId: id });
	};

	const handleRemove = () => {
		if (!id || !walletAddress) return;
		deleteMutation.mutate(id);
	};

	const displayedError = error ?? queryError?.message ?? null;

	if (!walletAddress) {
		return (
			<main className="min-h-full space-y-4 p-6 bg-linear-to-b from-white to-purple-50/30 dark:from-background dark:to-card/50">
				<p className="text-sm text-muted-foreground">
					Connect your wallet to view this project.
				</p>
				<Button variant="link" asChild className="mt-2 pl-0">
					<Link href="/projects">Back to Projects</Link>
				</Button>
			</main>
		);
	}

	if (loading) {
		return (
			<main className="min-h-full w-full space-y-6 p-6 bg-linear-to-b from-white to-purple-50/30 dark:from-background dark:to-card/50">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div>
							<div className="mb-2 h-7 w-40 animate-pulse rounded bg-muted" />
							<div className="h-4 w-48 animate-pulse rounded bg-muted" />
						</div>
					</div>
					<div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
				</div>
				<div className="space-y-4">
					<div className="h-40 animate-pulse rounded-lg bg-muted" />
					<div className="h-10 w-1/3 animate-pulse rounded bg-muted" />
				</div>
			</main>
		);
	}

	if (!loading && !project) {
		return (
			<main className="min-h-full space-y-4 p-6 bg-linear-to-b from-white to-purple-50/30 dark:from-background dark:to-card/50">
				<p className="text-sm text-destructive">
					{queryError?.message ?? "Project not found"}
				</p>
				<Button variant="outline" asChild>
					<Link href="/projects">
						<ArrowLeft className="size-4" />
						Back to Projects
					</Link>
				</Button>
			</main>
		);
	}

	return (
		<main className="min-h-full w-full p-6 bg-linear-to-b from-white to-purple-50/30 dark:from-background dark:to-card/50">
			<div className="mx-auto max-w-4xl space-y-8">
				<ProjectDetailHeader
					projectName={project!.name}
					onRemoveClick={() => {
						setError(null);
						setRemoveOpen(true);
					}}
				/>

				{displayedError ? (
					<div
						role="alert"
						className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
					>
						{displayedError}
					</div>
				) : null}

				<nav aria-label="On this page" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
					<span className="text-muted-foreground">On this page:</span>
					<a href="#credentials" className="text-primary hover:underline font-medium">
						Credentials & settings
					</a>
					<a href="#integration-guide" className="text-primary hover:underline font-medium">
						Integration guide
					</a>
				</nav>

			<ProjectPackageInfoCard
				project={project!}
				editingPaymentAddress={editingPaymentAddress}
				inlinePaymentAddress={inlinePaymentAddress}
				updateLoading={updateMutation.isPending}
				updateError={updateError}
				onInlinePaymentAddressChange={setInlinePaymentAddress}
				onSavePaymentAddress={handleUpdatePaymentAddress}
				onCancelEditPaymentAddress={() => {
					setEditingPaymentAddress(false);
					setUpdateError(null);
				}}
				onStartEditPaymentAddress={(address) => {
					setInlinePaymentAddress(address);
					setUpdateError(null);
					setEditingPaymentAddress(true);
				}}
				rotateLoading={rotateMutation.isPending}
				onRotateKeyClick={() => setRotateConfirmOpen(true)}
				onRefreshClick={refetch}
			/>

			<ProjectPreinstallCard
				preinstallScript={preinstallScript}
				projectId={project!.id}
				apiKey={project!.apiKeyValue ?? undefined}
				host={effectiveHost}
			/>
			</div>

			<AlertDialog
				open={rotateConfirmOpen}
				onOpenChange={setRotateConfirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Rotate API key?</AlertDialogTitle>
						<AlertDialogDescription>
							A new API key will be generated. The current key
							will stop working immediately. Make sure to update
							your integration with the new key after rotating.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => void handleRotateKey()}
							disabled={rotateMutation.isPending}
						>
							{rotateMutation.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<>
									<RefreshCw className="size-4" />
									Rotate key
								</>
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Remove this package?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This will deactivate the project and remove all
							associated data. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => void handleRemove()}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<>
									<Trash2 className="size-4" />
									Remove
								</>
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</main>
	);
}
