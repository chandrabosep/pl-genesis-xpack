"use client";

import Link from "next/link";
import ConnectButton from "./connect-btn";

export function NavBar() {
	return (
		<header className="border-b bg-white">
			<div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
				<Link
					href="/dashboard"
					className="text-lg font-semibold tracking-tight"
				>
					XPack
				</Link>
				<nav className="flex items-center gap-6 text-sm font-medium">
					<ConnectButton />
				</nav>
			</div>
		</header>
	);
}
