"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PricingModel } from "@/types/constants";
import { ProjectForm } from "@/components/projects/project-form";
import { useCreateProjectMutation } from "@/controllers/projects.mutations";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function CreatePackageButton({
	walletAddress,
	onCreated,
	variant = "default",
}: {
	walletAddress: string;
	onCreated: () => void;
	variant?: "default" | "inline";
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [message, setMessage] = useState("");
	const [name, setName] = useState("");
	const [price, setPrice] = useState("0.1");
	const [paymentAddress, setPaymentAddress] = useState("");
	const [pricingModel, setPricingModel] = useState<PricingModel>("per_device");
	const [receiveMode, setReceiveMode] = useState<"base" | "any_chain" | "sui">("base");
	const [unifiedReceiveAddress, setUnifiedReceiveAddress] = useState("");
	const [suiAddress, setSuiAddress] = useState("");

	// Default payment address to connected wallet when dialog opens
	useEffect(() => {
		if (open && walletAddress) {
			setPaymentAddress((prev) => prev || walletAddress);
			setUnifiedReceiveAddress((prev) => prev || walletAddress);
		}
	}, [open, walletAddress]);

	const createProject = useCreateProjectMutation(walletAddress, {
		onSuccess: (project) => {
			setOpen(false);
			setName("");
			setPrice("0.1");
			setPaymentAddress("");
			setPricingModel("per_device");
			setReceiveMode("base");
			setUnifiedReceiveAddress("");
			setSuiAddress("");
			onCreated();
			router.push(`/projects/${project.id}`);
		},
		onError: (err) => {
			setMessage(err.message ?? "Failed to create package.");
		},
	});

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setMessage("");
		if (receiveMode === "sui") {
			createProject.mutate({
				name,
				pricingModel,
				price: Number(price),
				receiveMode: "sui",
				suiAddress: suiAddress.trim(),
			});
			return;
		}
		const address = receiveMode === "any_chain" ? unifiedReceiveAddress.trim() || paymentAddress : paymentAddress;
		createProject.mutate({
			name,
			pricingModel,
			price: Number(price),
			paymentAddress: address,
			receiveMode,
			unifiedReceiveAddress: receiveMode === "any_chain" ? address : undefined,
		});
	};

	const isInline = variant === "inline";

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{isInline ? (
				<Button
					variant="default"
					size="default"
					onClick={() => setOpen(true)}
					className="mt-4"
				>
					<Plus className="size-4" />
					Create package
				</Button>
			) : (
				<Button
					variant="default"
					size="default"
					onClick={() => setOpen(true)}
				>
					<Plus className="size-4" />
					Create package
				</Button>
			)}
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Create package</DialogTitle>
				</DialogHeader>
				<ProjectForm
					name={name}
					price={price}
					paymentAddress={paymentAddress}
					pricingModel={pricingModel}
					receiveMode={receiveMode}
					unifiedReceiveAddress={unifiedReceiveAddress}
					suiAddress={suiAddress}
					onNameChange={setName}
					onPriceChange={setPrice}
					onPaymentAddressChange={setPaymentAddress}
					onPricingChange={setPricingModel}
					onReceiveModeChange={(mode) => {
						setReceiveMode(mode);
						if (mode === "any_chain" && !unifiedReceiveAddress) setUnifiedReceiveAddress(paymentAddress);
						if (mode === "sui") setSuiAddress("");
					}}
					onUnifiedReceiveAddressChange={setUnifiedReceiveAddress}
					onSuiAddressChange={setSuiAddress}
					onSubmit={handleSubmit}
				/>
				{createProject.isPending ? (
					<p className="text-sm text-muted-foreground">Creating…</p>
				) : message ? (
					<p className="text-sm text-destructive">{message}</p>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
