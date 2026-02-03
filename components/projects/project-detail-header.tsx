"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function ProjectDetailHeader({
	projectName,
	onRemoveClick,
}: {
	projectName: string;
	onRemoveClick: () => void;
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			<div className="flex items-center gap-3">
				<div>
					<h1 className="text-2xl font-semibold">{projectName}</h1>
					<p className="text-sm text-muted-foreground">
						Package details and actions
					</p>
				</div>
			</div>
			<Button
				variant="outline"
				size="icon"
				className="text-destructive bg-destructive/10 hover:bg-destructive/10 hover:text-destructive"
				aria-label="Remove package"
				onClick={onRemoveClick}
			>
				<Trash2 className="size-4" />
			</Button>
		</div>
	);
}
