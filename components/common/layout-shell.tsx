"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const hideSidebar = pathname?.startsWith("/pay");

	if (hideSidebar) {
		return <main className="min-h-screen">{children}</main>;
	}

	return (
		<div className="flex h-screen min-h-screen">
			<Sidebar />
			<main className="min-h-0 flex-1 overflow-auto">{children}</main>
		</div>
	);
}
