"use client";

import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";

export function NewProjectCard({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
		>
			<Card className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 py-8 transition-colors hover:border-purple-300/50 hover:bg-muted/50">
				<div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
					<Plus className="size-6" />
				</div>
				<span className="text-sm font-medium text-muted-foreground">
					New project
				</span>
			</Card>
		</button>
	);
}
