"use client";

import { useState } from "react";
import type { ProjectSummary } from "@/types/projects";
import { pricingModelLabel } from "@/lib/utils";
import {
	useUpdateProjectMutation,
	useRotateProjectKeyMutation,
	useDeleteProjectMutation,
} from "@/controllers/projects.mutations";
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
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
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import {
	KeyRound,
	Loader2,
	Pencil,
	Trash2,
} from "lucide-react";

export function DashboardPackageCard({
	project,
	walletAddress,
	onUpdated,
	embedded = false,
}: {
	project: ProjectSummary;
	walletAddress: string;
	onUpdated: () => void;
	embedded?: boolean;
}) {
	const [rotateOpen, setRotateOpen] = useState(false);
	const [removeOpen, setRemoveOpen] = useState(false);
	const [updateAddressOpen, setUpdateAddressOpen] = useState(false);
	const [updateAddressValue, setUpdateAddressValue] = useState(
		project.paymentAddress,
	);

	const updateMutation = useUpdateProjectMutation(walletAddress, {
		onSuccess: () => {
			setUpdateAddressOpen(false);
			onUpdated();
		},
		onError: (err) => alert(err.message ?? "Failed to update address."),
	});
	const rotateMutation = useRotateProjectKeyMutation(walletAddress, {
		onSuccess: () => {
			setRotateOpen(false);
			onUpdated();
		},
		onError: (err) => alert(err.message ?? "Failed to rotate key."),
	});
	const deleteMutation = useDeleteProjectMutation(walletAddress, {
		onSuccess: () => {
			setRemoveOpen(false);
			onUpdated();
		},
		onError: (err) => alert(err.message ?? "Failed to remove package."),
	});

	const handleRotate = () => {
		rotateMutation.mutate({ projectId: project.id });
	};

	const handleRemove = () => {
		deleteMutation.mutate(project.id);
	};

	const handleUpdateAddress = (e: React.FormEvent) => {
		e.preventDefault();
		updateMutation.mutate({
			projectId: project.id,
			paymentAddress: updateAddressValue,
		});
	};

	const content = (
		<>
			{!embedded && (
				<CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
					<CardTitle className="text-base font-medium leading-tight">
						{project.name}
					</CardTitle>
					<Badge variant="secondary" className="shrink-0 text-xs font-normal">
						{project.pricingModel}
					</Badge>
				</CardHeader>
			)}
			<CardContent
				className={embedded ? "space-y-3 pt-0" : "flex-1 space-y-3"}
			>
				{embedded && (
					<div className="text-xs text-muted-foreground">
						<span className="font-medium text-foreground">Pricing:</span>{" "}
						{pricingModelLabel(project.pricingModel)} · {project.price ?? 0}{" "}
						USDC
					</div>
				)}
				{!embedded && (
					<>
						<div className="text-xs text-muted-foreground">
							<span className="font-medium text-foreground">Price:</span>{" "}
							{project.price ?? 0} USDC
						</div>
						<div className="text-xs text-muted-foreground">
							<span className="font-medium text-foreground">
								Payment address:
							</span>{" "}
							<span className="break-all font-mono">
								{project.paymentAddress}
							</span>
						</div>
					</>
				)}
				{embedded && (
					<div className="text-xs text-muted-foreground">
						<span className="font-medium text-foreground">
							Payment address:
						</span>{" "}
						<span className="break-all font-mono">
							{project.paymentAddress}
						</span>
					</div>
				)}
				{project.apiKeyValue ? (
					<div className="rounded-md border bg-muted/50 p-3">
						<div className="flex items-center justify-between gap-2">
							<span className="text-xs font-medium text-muted-foreground">
								API key
							</span>
							<CopyButton
								value={project.apiKeyValue}
								label="Copy API key"
								buttonText="Copy"
								className="h-6 shrink-0"
							/>
						</div>
						<code className="mt-1 block truncate text-xs font-mono text-foreground">
							{project.apiKeyValue}
						</code>
						<p className="mt-1 text-[10px] text-muted-foreground">
							Project ID: {project.id}
						</p>
					</div>
				) : null}
			</CardContent>
			<CardFooter className="flex flex-wrap gap-2 border-t pt-4">
				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						setUpdateAddressValue(project.paymentAddress);
						setUpdateAddressOpen(true);
					}}
				>
					<Pencil className="size-3.5" />
					Update address
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setRotateOpen(true)}
				>
					<KeyRound className="size-3.5" />
					Rotate key
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className="text-destructive hover:bg-destructive/10 hover:text-destructive"
					onClick={() => setRemoveOpen(true)}
				>
					<Trash2 className="size-3.5" />
					Remove
				</Button>
			</CardFooter>
		</>
	);

	return (
		<>
			{embedded ? (
				<div className="space-y-0">{content}</div>
			) : (
				<Card className="flex h-full flex-col">{content}</Card>
			)}

			<AlertDialog open={rotateOpen} onOpenChange={setRotateOpen}>
				<AlertDialogContent className="max-w-sm">
					<AlertDialogHeader>
						<AlertDialogTitle>Rotate API key?</AlertDialogTitle>
						<AlertDialogDescription>
							This will invalidate your current API key. Any integrations or
							apps using the old key will stop working. A new key will be
							generated. Continue?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={rotateMutation.isPending}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								void handleRotate();
							}}
								disabled={rotateMutation.isPending}
						>
							{rotateMutation.isPending ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Rotating…
								</>
							) : (
								"Rotate key"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
				<AlertDialogContent className="max-w-sm">
					<AlertDialogHeader>
						<AlertDialogTitle>Remove package?</AlertDialogTitle>
						<AlertDialogDescription>
							This package and its API keys will be permanently deleted. This
							cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={(e) => {
								e.preventDefault();
								void handleRemove();
							}}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Removing…
								</>
							) : (
								"Remove"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<Dialog open={updateAddressOpen} onOpenChange={setUpdateAddressOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Update payment address</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleUpdateAddress} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="payment-address">Payment address</Label>
							<Input
								id="payment-address"
								value={updateAddressValue}
								onChange={(e) => setUpdateAddressValue(e.target.value)}
								placeholder="0x..."
								required
							/>
						</div>
						<DialogFooter>
							<DialogClose asChild>
								<Button
									type="button"
									variant="outline"
									disabled={updateMutation.isPending}
								>
									Cancel
								</Button>
							</DialogClose>
							<Button type="submit" disabled={updateMutation.isPending}>
								{updateMutation.isPending ? (
									<>
										<Loader2 className="size-4 animate-spin" />
										Saving…
									</>
								) : (
									"Save"
								)}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}
