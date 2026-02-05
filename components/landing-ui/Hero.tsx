"use client";
import ConnectButton from "../common/connect-btn";
import { Button } from "../ui/button";
import { JetBrains_Mono } from "next/font/google";
import { useAccount } from "wagmi";

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
								<Button>Dashboard</Button>
							) : (
								<ConnectButton />
							)}
						</div>
					</div>
					<div className="lg:col-span-6 relative h-[600px] reveal-up">
						<div className="absolute top-0 right-0 w-[60%] aspect-4/5 rounded-[2rem] overflow-hidden shadow-2xl border border-gray-200 z-10 bg-white p-6">
							<div className="space-y-4">
								<div className="flex items-center justify-between pb-4 border-b border-gray-100">
									<h3 className="text-sm font-bold text-gray-900">
										Connect Wallet
									</h3>
									<div className="w-2 h-2 bg-green-500 rounded-full"></div>
								</div>
								<div className="space-y-3">
									<div className="flex items-center gap-3 p-4 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer">
										<div className="w-10 h-10 rounded-full bg-linear-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs">
											M
										</div>
										<div>
											<p className="text-sm font-bold text-gray-900">
												MetaMask
											</p>
											<p className="text-[10px] text-gray-500">
												Most popular
											</p>
										</div>
									</div>
									<div className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
										<div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
											W
										</div>
										<div>
											<p className="text-sm font-bold text-gray-900">
												WalletConnect
											</p>
											<p className="text-[10px] text-gray-500">
												Mobile wallets
											</p>
										</div>
									</div>
									<div className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
										<div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
											C
										</div>
										<div>
											<p className="text-sm font-bold text-gray-900">
												Coinbase Wallet
											</p>
											<p className="text-[10px] text-gray-500">
												Easy setup
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* <!-- Left Middle Overlapping Image - Package Dashboard --> */}
						<div className="absolute top-1/4 left-0 w-[50%] aspect-square rounded-[2rem] overflow-hidden shadow-2xl border border-gray-200 z-20 bg-gradient-to-br from-purple-50 to-cyan-50 p-6">
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<h3 className="text-sm font-bold text-gray-900">
										My Packages
									</h3>
									<span className="text-[10px] uppercase tracking-widest font-bold text-purple-600">
										3 Active
									</span>
								</div>
								<div className="space-y-2">
									<div className="bg-white rounded-xl p-4 border border-gray-200">
										<div className="flex items-center justify-between mb-2">
											<p className="font-mono text-xs font-bold text-gray-900">
												@crypto/auth-sdk
											</p>
											<span className="text-[10px] text-green-600 font-bold">
												Active
											</span>
										</div>
										<div className="flex items-center gap-4 text-[10px] text-gray-500">
											<span>142 installs</span>
											<span>$420 earned</span>
										</div>
									</div>
									<div className="bg-white rounded-xl p-4 border border-gray-200">
										<div className="flex items-center justify-between mb-2">
											<p className="font-mono text-xs font-bold text-gray-900">
												@web3/payment-lib
											</p>
											<span className="text-[10px] text-green-600 font-bold">
												Active
											</span>
										</div>
										<div className="flex items-center gap-4 text-[10px] text-gray-500">
											<span>89 installs</span>
											<span>$267 earned</span>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* <!-- Bottom Front Overlapping Image - Payment Interface --> */}
						<div className="absolute bottom-[-5%] left-1/4 w-[40%] aspect-3/4 rounded-[2rem] overflow-hidden shadow-2xl border border-gray-200 z-30 bg-white p-6">
							<div className="space-y-4">
								<div className="text-center pb-4 border-b border-gray-100">
									<p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">
										Total Earnings
									</p>
									<p className="text-3xl font-bold text-gray-900">
										$687
									</p>
									<p className="text-xs text-gray-500 mt-1">
										≈ 0.42 ETH
									</p>
								</div>
								<div className="space-y-2">
									<div className="flex items-center justify-between py-2 border-b border-gray-50">
										<span className="text-xs text-gray-600">
											This month
										</span>
										<span className="text-xs font-bold text-gray-900">
											$142
										</span>
									</div>
									<div className="flex items-center justify-between py-2 border-b border-gray-50">
										<span className="text-xs text-gray-600">
											Active subs
										</span>
										<span className="text-xs font-bold text-gray-900">
											23
										</span>
									</div>
									<div className="flex items-center justify-between py-2">
										<span className="text-xs text-gray-600">
											Devices
										</span>
										<span className="text-xs font-bold text-gray-900">
											67
										</span>
									</div>
								</div>
								<button className="w-full py-3 rounded-xl bg-linear-to-r from-purple-600 to-purple-700 text-white text-xs font-bold hover:from-purple-700 hover:to-purple-800 transition-all">
									Withdraw
								</button>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}

export default Hero;
