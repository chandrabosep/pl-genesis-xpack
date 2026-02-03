"use client";

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import ConnectButton from "@/components/common/connect-btn";

export default function LandingPage() {
	const { isConnected } = useAccount();
	const router = useRouter();

	// useEffect(() => {
	// 	if (isConnected) {
	// 		router.replace("/dashboard");
	// 	}
	// }, [isConnected, router]);

	return (
		<div className="min-h-screen flex flex-col">
			<header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
				<div className="container flex h-14 items-center justify-between px-6">
					<Link
						href="/"
						className="text-lg font-semibold tracking-tight text-foreground"
					>
						Xpack
					</Link>
					<nav className="flex items-center gap-4">
						{isConnected && (
							<Link
								href="/dashboard"
								className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
							>
								Dashboard
							</Link>
						)}
						<ConnectButton />
					</nav>
				</div>
			</header>

			<main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
				<h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-foreground">
					Monetize your apps with Xpack
				</h1>
				<p className="mt-6 max-w-2xl text-lg text-muted-foreground">
					Accept one-time and recurring payments in your app. Connect your
					wallet to manage packages, view analytics, and get paid.
				</p>
				<div className="mt-10">
					<ConnectButton />
				</div>
			</main>
		</div>
	);
}
