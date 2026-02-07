import type { Metadata } from "next";
import {
	Geist,
	Geist_Mono,
	Noto_Sans,
	DM_Sans,
	Fraunces,
} from "next/font/google";
import "./globals.css";
import ContextProvider from "@/context";
import { headers } from "next/headers";
import { LayoutShell } from "@/components/common/layout-shell";

const notoSans = Noto_Sans({
	variable: "--font-sans",
	subsets: ["latin"],
});

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const dmSans = DM_Sans({
	variable: "--font-dm-sans",
	subsets: ["latin"],
	weight: ["400", "500", "700"],
});

const fraunces = Fraunces({
	variable: "--font-fraunces",
	subsets: ["latin"],
	weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
	title: "Xpack - Monetize your NPM packages with crypto",
	description:
		"Xpack is a Web3 platform that lets npm package authors monetize their packages with crypto. Authors connect a wallet, add a small payment config and preinstall script to their package.json, and get paid when users install—no custom backend or traditional payment processor; payments are on-chain. When someone runs `npm install`, the preinstall script talks to the project’s install API. If payment is required, the API returns **402 Payment Required** with payment details and the user is sent to a pay page to connect their wallet and pay in **USDC (EVM)** or **native SUI**. Authors can set **per-device**, **per-user**, or **subscription** pricing and manage projects and payment history from the dashboard.",
	keywords: [
		"xpack",
		"npm",
		"crypto",
		"monetization",
		"web3",
		"blockchain",
		"payments",
		"subscriptions",
		"per-device",
		"per-user",
		"subscription",
	],
	authors: [{ name: "Xpack", url: "https://hack-money-xpack.vercel.app/" }],
	creator: "Xpack",
	publisher: "Xpack",
	openGraph: {
		title: "Xpack - Monetize your NPM packages with crypto",
		description:
			"Xpack is a Web3 platform that lets npm package authors monetize their packages with crypto. Authors connect a wallet, add a small payment config and preinstall script to their package.json, and get paid when users install—no custom backend or traditional payment processor; payments are on-chain. When someone runs `npm install`, the preinstall script talks to the project’s install API. If payment is required, the API returns **402 Payment Required** with payment details and the user is sent to a pay page to connect their wallet and pay in **USDC (EVM)** or **native SUI**. Authors can set **per-device**, **per-user**, or **subscription** pricing and manage projects and payment history from the dashboard.",
		url: "https://hack-money-xpack.vercel.app/",
		siteName: "Xpack",
		locale: "en_US",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Xpack - Monetize your NPM packages with crypto",
		description:
			"Xpack is a Web3 platform that lets npm package authors monetize their packages with crypto. Authors connect a wallet, add a small payment config and preinstall script to their package.json, and get paid when users install—no custom backend or traditional payment processor; payments are on-chain. When someone runs `npm install`, the preinstall script talks to the project’s install API. If payment is required, the API returns **402 Payment Required** with payment details and the user is sent to a pay page to connect their wallet and pay in **USDC (EVM)** or **native SUI**. Authors can set **per-device**, **per-user**, or **subscription** pricing and manage projects and payment history from the dashboard.",
	},
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const headersObj = await headers();
	const cookies = headersObj.get("cookie");
	return (
		<html lang="en" className={notoSans.variable}>
			<body
				className={` ${dmSans.variable} ${fraunces.variable} antialiased`}
			>
				<ContextProvider cookies={cookies}>
					<LayoutShell>{children}</LayoutShell>
				</ContextProvider>
			</body>
		</html>
	);
}
