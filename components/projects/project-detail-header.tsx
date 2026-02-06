"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, ChevronRight, MoreHorizontal, Trash2 } from "lucide-react";

export function ProjectDetailHeader({
	projectName,
	onRemoveClick,
}: {
	projectName: string;
	onRemoveClick: () => void;
}) {
	return (
		<header className="space-y-3">
			<nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
				<Button variant="ghost" size="sm" className="h-auto p-0 text-muted-foreground hover:text-foreground" asChild>
					<Link href="/projects" className="flex items-center gap-1.5">
						<ArrowLeft className="size-3.5" />
						Projects
					</Link>
				</Button>
				<ChevronRight className="size-3.5 text-muted-foreground/70" aria-hidden />
				<span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-[320px]" title={projectName}>
					{projectName}
				</span>
			</nav>
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-foreground">
						{projectName}
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Credentials and integration guide for this package.
					</p>
				</div>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="outline"
							size="icon"
							className="shrink-0"
							aria-label="Project options"
						>
							<MoreHorizontal className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							variant="destructive"
							onClick={onRemoveClick}
							className="gap-2"
						>
							<Trash2 className="size-4" />
							Remove project
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	);
}
