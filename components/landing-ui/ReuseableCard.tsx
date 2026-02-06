import React from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { LucideIcon } from "lucide-react";

interface Props {
	icon: LucideIcon;
	stepNumber?: number;
	title: string;
	description: string;
}

function ResuableCard({ icon: Icon, stepNumber, title, description }: Props) {
	return (
		<Card className="relative flex flex-col h-full overflow-hidden rounded-2xl border border-purple-100 bg-linear-to-br from-accent/10 to-accent/5 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-600/5 transition-all duration-300 min-h-[144px]"> {/* Ensure consistent min-h */}
			<CardHeader className="flex flex-col justify-between flex-1 space-y-4 h-full">
				<div className="flex items-center gap-2">
					{stepNumber && (
						<span className="text-sm bg-purple-50 w-fit px-4 py-1 rounded-md text-purple-600">
							Step{stepNumber}
						</span>
					)}
				</div>

				<CardTitle className="text-xl font-bold flex items-center gap-2">
					{Icon && <Icon className="w-6 h-6 text-purple-600" />}
					{title}
				</CardTitle>
				<CardDescription className="text-base leading-relaxed flex-1">
					{description}
				</CardDescription>
			</CardHeader>
		</Card>
	);
}

export default ResuableCard;
