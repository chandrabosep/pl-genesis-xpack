"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectButton from "./connect-btn";

const links = [
	{ href: "/dashboard", label: "Dashboard" },
	{ href: "/projects", label: "Projects" },
	{ href: "/billing", label: "Billing" },
];

export function NavBar() {
	const pathname = usePathname();

	return (
		<header className="border-b bg-white">
			<div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
				<Link
					href="/dashboard"
					className="text-lg font-semibold tracking-tight"
				>
					XPack{" "}
				</Link>
				<nav className="flex items-center gap-8 text-sm font-medium">
					{links.map((link) => {
						const active = pathname === link.href;
						return (
							<Link
								key={link.href}
								href={link.href}
								className={
									active
										? "text-black underline underline-offset-4"
										: "text-neutral-600 hover:text-black"
								}
							>
								{link.label}
							</Link>
						);
					})}
					<ConnectButton />
				</nav>
			</div>
		</header>
	);
}
