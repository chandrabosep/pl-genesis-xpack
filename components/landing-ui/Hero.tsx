"use client";
import ConnectButton from "../common/connect-btn";
import { Button } from "../ui/button";
import { JetBrains_Mono } from "next/font/google";
import { useAccount } from "wagmi";
import Link from "next/link";
import {
	Coins,
	Repeat,
	Sparkles,
	Package,
	Wallet,
	KeyRound,
	Zap,
	LayoutDashboard,
	Network,
} from "lucide-react";

const jetBrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
});

function Hero() {
	const { isConnected } = useAccount();
	return (
		<div className="w-full">
			<section className="relative w-full min-h-[calc(100vh-100px)] flex items-center overflow-hidden">
				<div className="absolute top-1/4 right-0 size-60 bg-purple-600/10 rounded-full blur-[140px] -z-10"></div>
				<div className="absolute bottom-1/4 left-1/4 size-60 bg-cyan-500/5 rounded-full blur-[120px] -z-10"></div>

				<div className="w-full max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center relative z-10">
					<div className="lg:col-span-6 space-y-10">
						<div className="space-y-6">
							<div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-full px-4 py-2">
								<span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></span>
								<span className="text-[10px] uppercase tracking-widest font-bold text-purple-600">
									Web3 Powered
								</span>
							</div>
							<h1
								className={`md:6xl lg:text-7xl font-bold leading-[1.1] tracking-tight reveal-up ${jetBrainsMono.className}`}
							>
								Monetize your
								<br />
								<span className="font-serif italic text-gradient bg-linear-to-r from-purple-600 to-cyan-500 bg-clip-text text-transparent">
									NPM packages
								</span>
								<br />
								with crypto
							</h1>
							<p className="text-xl text-gray-600 max-w-lg leading-relaxed reveal-up">
								{/* Connect your wallet, publish your package, and start earning instantly. No backend, no payment processors, just pure Web3 monetization. */}
								Accept one-time and recurring payments in your
								app. Connect your wallet to manage packages,
								view analytics, and get paid.
							</p>
						</div>

						<div className="flex flex-wrap gap-5 reveal-up">
							{isConnected ? (
								<Link href="/dashboard">
									<Button
										variant="default"
										size="lg"
										className="text-lg w-full h-12 px-4 rounded-sm shadow-sm"
									>
										Open Dashboard
									</Button>
								</Link>
							) : (
								<ConnectButton />
							)}
						</div>
					</div>
					<div className="lg:col-span-6 relative h-[540px] reveal-up">
						{/* Card 1: Payments we accept — theme: purple/cyan only */}
						<div className="bg-white absolute top-0 right-0 w-[55%] rounded-2xl z-20 overflow-hidden border bg-linear-to-br from-accent/10 to-accent/5 p-5 border-purple-200 shadow-xl shadow-purple-600/5 transition-all duration-300">
							<div className="flex items-center gap-2 mb-4">
								<div className="flex h-9 w-9 items-center justify-center rounded-xl text-purple-600">
									<Coins className="h-5 w-5" />
								</div>
								<div>
									<h3 className="text-sm font-bold text-gray-900">
										Payments we accept
									</h3>
									<p className="text-[11px] text-gray-500">
										Instant settlement to your wallet
									</p>
								</div>
							</div>
							<div className="flex flex-wrap gap-2">
								{["USDC", "SUI","ETH"].map(
									(symbol) => (
										<span
											key={symbol}
											className="inline-flex items-center px-3 py-2 rounded-lg bg-purple-50 border text-purple-700 text-xs font-semibold border-purple-200 transition-colors"
										>
											{symbol}
										</span>
									),
								)}
							</div>
						</div>

						{/* Card 2: Subscription types — same card style as ReuseableCard */}
						<div className="bg-white absolute top-[14%] left-0 w-[54%] rounded-2xl z-10 overflow-hidden border bg-linear-to-br from-accent/10 to-accent/5 p-5 border-purple-200 shadow-xl shadow-purple-600/5 transition-all duration-300">
							<div className="flex items-center gap-2 mb-4">
								<div className="flex h-9 w-9 items-center justify-center rounded-xl text-purple-600">
									<Repeat className="h-5 w-5" />
								</div>
								<h3 className="text-sm font-bold text-gray-900">
									Subscription types
								</h3>
							</div>
							<ul className="space-y-3">
								{[
									{
										name: "Subscription",
										desc: "Recurring billing",
										Icon: Repeat,
									},
									{
										name: "Per user",
										desc: "GitHub-based licensing",
										Icon: KeyRound,
									},
									{
										name: "Per device",
										desc: "Track & bill per device",
										Icon: Zap,
									},
									{
										name: "One-time",
										desc: "Single payment access",
										Icon: Wallet,
									},
								].map(({ name, desc, Icon }) => (
									<li
										key={name}
										className="flex items-center gap-3 rounded-xl bg-white/60 py-2.5 px-3 border border-purple-100"
									>
										<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-purple-600">
											<Icon className="h-4 w-4" />
										</div>
										<div className="flex-1 min-w-0">
											<span className="text-sm font-semibold text-gray-900">
												{name}
											</span>
											<span className="text-[11px] text-gray-500 ml-2">
												{desc}
											</span>
										</div>
									</li>
								))}
							</ul>
						</div>

						{/* Card 3: Features — purple/cyan gradient accent, same borders/shadows */}
						<div className="bg-white absolute bottom-[10%] left-[45%] right-0 w-[50%] rounded-2xl z-30 overflow-hidden border bg-linear-to-br from-accent/10 to-accent/5 p-5 border-purple-200 shadow-xl shadow-purple-600/5 transition-all duration-300">
							<div className="flex items-center gap-2 mb-3 mt-1">
								<div className="flex h-9 w-9 items-center justify-center rounded-xl text-purple-600">
									<Sparkles className="h-5 w-5" />
								</div>
								<div>
									<h3 className="text-sm font-bold text-gray-900">
										Our features
									</h3>
									<p className="text-[11px] text-gray-500">
										Everything to monetize your code
									</p>
								</div>
							</div>
							<ul className="grid gap-2">
								{[
									{
										text: "Monetize native npm packages",
										Icon: LayoutDashboard,
									},
									{
										text: "USDC (EVM) + SUI payments",
										Icon: Package,
									},
									{
										text: "Multi-chain & Circle Gateway payouts",
										Icon: Network,
									},
									// {
									// 	text: "Per-device, per-user & subscription licensing",
									// 	Icon: KeyRound,
									// },
								].map(({ text, Icon }) => (
									<li
										key={text}
										className="flex items-center gap-3 rounded-lg py-2 px-2.5 hover:bg-white/50 transition-colors"
									>
										<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-purple-600">
											<Icon className="h-3.5 w-3.5" />
										</div>
										<span className="text-sm text-gray-700">
											{text}
										</span>
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}

export default Hero;
