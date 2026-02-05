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
} from "lucide-react";

export default function LandingPage() {
	const { isConnected } = useAccount();

	const stats = [
		{
			id: 1,
			icon: Rocket,
			title: "10× Reach",
			description:
				"Distribute your package globally with crypto payments. Access markets you couldn't reach before.",
		},
		{
			id: 2,
			icon: DollarSign,
			title: "Recurring Revenue",
			description:
				"Subscriptions, per-user, and per-device licensing unlock steady income streams and predictable growth.",
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
				"Link your Web3 wallet (MetaMask, WalletConnect, Coinbase) in seconds. Your wallet address becomes your payment endpoint.",
		},
		{
			id: 2,
			stepNumber: 2,
			icon: Code,
			title: "Publish Package",
			description:
				"Add payment config to package.json. Choose subscription, per-user, or per-device licensing. Publish to NPM as usual.",
		},
		{
			id: 3,
			stepNumber: 3,
			icon: DollarSign,
			title: "Get Paid",
			description:
				"Users pay with crypto on install. Funds go directly to your wallet. Withdraw anytime, no minimum threshold.",
		},
	];

	const featuresData = [
		{
			id: 1,
			icon: Lock,
			title: "Secure Access",
			description:
				"Blockchain-verified authentication ensures only paid users can access your code.",
		},
		{
			id: 2,
			icon: Zap,
			title: "Subscription & Per-User",
			description:
				"Subscription tiers or one-time per-user (GitHub) licensing. Flexible pricing and renewal options.",
		},
		{
			id: 3,
			icon: BarChart3,
			title: "Per-Device Licensing",
			description:
				"Track usage per device and bill accordingly. Perfect for scaling teams.",
		},
		{
			id: 4,
			icon: Wallet,
			title: "Crypto Payments",
			description:
				"Accept payments in multiple cryptocurrencies with instant settlement to your wallet.",
		},
		{
			id: 5,
			icon: Download,
			title: "Paid Npm Packages",
			description:
				"Seamless integration and monitize your packages easily with existing NPM workflow and tooling.",
		},
		{
			id: 6,
			icon: CircleDollarSign,
			title: "Multi-Currency Payments",
			description:
				"Accept payments in ETH, USDC, DAI, and more with instant settlement.",
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
								<span className="font-serif italic text-gradient bg-gradient-to-r from-purple-600 to-cyan-500 bg-clip-text text-transparent">
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
								<span className="font-serif italic text-gradient bg-gradient-to-r from-purple-600 to-cyan-500 bg-clip-text text-transparent">
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

				{/* features */}
				<section
					id="features"
					className="px-4 py-12 sm:px-6 lg:px-8 reveal-up"
				>
					<div className="max-w-7xl mx-auto px-4">
						<div className="text-center mb-20 space-y-4 reveal-up">
							<h2 className="text-3xl md:text-5xl font-bold tracking-tight">
								Powerful{" "}
								<span className="font-serif italic text-gradient bg-gradient-to-r from-purple-600 to-cyan-500 bg-clip-text text-transparent">
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
