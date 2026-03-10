"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import ConnectButton from "@/components/common/connect-btn";
import Hero from "@/components/landing-ui/Hero";
import ResuableCard from "@/components/landing-ui/ReuseableCard";
import {
	Rocket,
	DollarSign,
	Zap,
	Wallet,
	Code,
	CircleDollarSign,
	Download,
	BarChart3,
	Lock,
	Copy,
} from "lucide-react";

export default function LandingPage() {
	const { isConnected } = useAccount();

	const stats = [
		{
			id: 1,
			icon: Rocket,
			title: "10× Reach",
			description:
				"Get paid for your npm package with crypto. No private registry needed.",
		},
		{
			id: 2,
			icon: DollarSign,
			title: "Recurring Revenue",
			description:
				"Unlock recurring revenue with subscription, per user, or per device licensing models to ensure reliable growth.",
		},
		{
			id: 3,
			icon: Zap,
			title: "Faster Monetization",
			description:
				"Start earning in minutes, not months. No complex setup, just connect your wallet and publish.",
		},
	];

	const howitworks = [
		{
			id: 1,
			stepNumber: 1,
			icon: Wallet,
			title: "Connect Wallet",
			description:
				"Connect your Web3 wallet instantly. Your wallet becomes your payment destination.",
		},
		{
			id: 2,
			stepNumber: 2,
			icon: Code,
			title: "Publish Package",
			description:
				"Effortlessly add payment details (subscription, per-user, or per-device) to your package.json. Publish to NPM and enjoy a smooth workflow.",
		},
		{
			id: 3,
			stepNumber: 3,
			icon: DollarSign,
			title: "Get Paid",
			description:
				"Users complete crypto payment at install. The funds are sent instantly to your wallet withdraw anytime, with no minimums.",
		},
	];

	const featuresData = [
		{
			id: 1,
			icon: Wallet,
			title: "Direct Crypto Payments",
			description:
				"Receive payments from users instantly and directly to your wallet, without any middlemen.",
		},
		{
			id: 2,
			icon: DollarSign,
			title: "Flexible Monetization",
			description:
				"Charge by subscription, user, or device. Choose the model that fits your business and update it anytime.",
		},
		{
			id: 3,
			icon: Lock,
			title: "Package Access Control",
			description:
				"Restrict or unlock npm package installs based on blockchain-verified payment. Automated access revocation for expiring subscriptions.",
		},
		{
			id: 4,
			icon: BarChart3,
			title: "Usage Tracking",
			description:
				"Track installs by user or device. Get analytics for your paid packages and understand your audience.",
		},
		{
			id: 5,
			icon: Download,
			title: "Seamless NPM Integration",
			description:
				"Use your normal npm workflow. No custom registry or package manager required—just add preinstall script.",
		},
		{
			id: 6,
			icon: CircleDollarSign,
			title: "Multi-chain & Multi-currency",
			description:
				"Accept ETH, USDC, and more on major EVM chains and Sui. Get paid in your preferred currency.",
		},
	];

	return (
		<div className="min-h-screen flex flex-col">
			<header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
				<nav
					className="fixed top-0 w-full z-50 px-6 py-4 transition-all duration-500"
					id="navbar"
				>
					<div className="max-w-7xl mx-auto flex items-center justify-between bg-white/70 backdrop-blur-md border border-black/5 rounded-2xl px-8 py-3">
						<Link
							href="/"
							className="text-2xl font-bold tracking-tight flex items-center gap-2"
						>
							<span className="text-purple-600">
								X<span className="text-gray-900">pack</span>
							</span>
						</Link>
						<div className="flex items-center gap-8">
							{isConnected ? (
								<Link
									href="/dashboard"
									className=" text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
								>
									Dashboard
								</Link>
							) : null}
							<ConnectButton />
						</div>
					</div>
				</nav>
			</header>

			<main className="pt-24">
				<Hero />
				{/* stats-section */}
				<section
					id="stats"
					className="px-4 py-12 sm:px-6 lg:px-8 reveal-up"
				>
					<div className="mx-auto max-w-7xl">
						<div className="mb-12 space-y-4 text-center">
							<h2 className="text-3xl md:text-5xl font-bold tracking-tight ">
								Why Choose{" "}
								<span className="bg-purple-600 bg-clip-text text-transparent">
									Xpack?{" "}
								</span>
							</h2>
							<p className="text-xl text-gray-600 max-w-2xl mx-auto">
								The essential benefits for package monetization
							</p>
						</div>
						<div className="grid grid-cols-1 gap-6 md:grid-cols-3 reveal-up">
							{stats.map((feature) => (
								<ResuableCard
									key={feature.id}
									icon={feature.icon}
									title={feature.title}
									description={feature.description}
								/>
							))}
						</div>
					</div>
				</section>

				{/* howitworks */}
				<section
					id="howitworks"
					className="px-4 py-12 sm:px-6 lg:px-8 reveal-up"
				>
					<div className="max-w-7xl mx-auto px-4">
						<div className="text-center mb-20 space-y-4 reveal-up">
							<h2 className="text-3xl md:text-5xl font-bold tracking-tight">
								How it{" "}
								<span className="bg-purple-600 bg-clip-text text-transparent">
									Works
								</span>
							</h2>
							<p className="text-xl text-gray-600 max-w-2xl mx-auto">
								Three steps to monetize your open-source work
							</p>
						</div>
						<div className="grid md:grid-cols-3 gap-8">
							{howitworks.map((step) => (
								<ResuableCard
									key={step.id}
									stepNumber={step.stepNumber}
									icon={step.icon}
									title={step.title}
									description={step.description}
								/>
							))}
						</div>
					</div>
				</section>

				<section className="px-4 py-12 sm:px-6 lg:px-8 reveal-up">
					<div className="mb-10 flex flex-col items-center gap-y-10">
						<h2 className="text-3xl md:text-4xl font-bold tracking-tight">
							Explore Xpack{" "}
							<span className="bg-purple-600 bg-clip-text text-transparent">
								Modules
							</span>
						</h2>
						<div className="grid gap-3 w-full max-w-xl">
							{[
								{
									label: "Starknet",
									sub: "(coming soon)",
									package: "xpack-starknet",
								},
								{
									label: "Sui payments",
									package: "xpack-sui",
								},
								{
									label: "Per-device pricing",
									package: "xpack-per-device",
								},
							].map(({ label, sub, package: pkg }) => (
								<div
									key={pkg}
									className="rounded-lg border px-5 py-4 flex items-center justify-between"
								>
									<div>
										<span className="font-semibold text-foreground">
											{label}
										</span>
										{sub && (
											<span className="ml-2 text-xs text-primary align-middle">
												{sub}
											</span>
										)}
									</div>
									<div className="flex items-center gap-2">
										<code className="bg-background rounded px-2 py-1 text-purple-700 font-mono text-sm">
											npm i {pkg}
										</code>
										<button
											type="button"
											onClick={() => {
												navigator.clipboard.writeText(
													`npm i ${pkg}`,
												);
											}}
											className="ml-1 p-1 rounded hover:bg-muted transition-colors cursor-pointer "
											title="Copy to clipboard"
											aria-label={`Copy npm install for ${pkg}`}
										>
											<Copy className="w-4 h-4 text-purple-700" />
										</button>
									</div>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* features */}
				<section
					id="features"
					className="px-4 py-12 sm:px-6 lg:px-8 reveal-up"
				>
					<div className="max-w-7xl mx-auto px-4">
						<div className="text-center mb-20 space-y-4 reveal-up">
							<h2 className="text-3xl md:text-5xl font-bold tracking-tight">
								Powerful{" "}
								<span className="bg-purple-600 bg-clip-text text-transparent">
									Features
								</span>
							</h2>
							<p className="text-xl text-gray-600 max-w-2xl mx-auto">
								Everything creators need to monetize their code
							</p>
						</div>
						<div className="grid md:grid-cols-3 gap-8">
							{featuresData.map((step) => (
								<ResuableCard
									key={step.id}
									icon={step.icon}
									title={step.title}
									description={step.description}
								/>
							))}
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
