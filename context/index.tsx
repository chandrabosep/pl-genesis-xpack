"use client";

import { wagmiAdapter, projectId, networks } from "@/config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { baseSepolia } from "@reown/appkit/networks";
import React, { type ReactNode } from "react";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";
import {
	createNetworkConfig,
	SuiClientProvider,
	WalletProvider,
} from "@mysten/dapp-kit";
import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { getSuiNetwork } from "@/lib/x402/payment-config";

// Set up queryClient with shared refetch policy
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000, // 1 minute
			refetchOnWindowFocus: true,
		},
	},
});

if (!projectId) {
	throw new Error("Project ID is not defined");
}

// Set up metadata
const metadata = {
	name: "appkit-example",
	description: "AppKit Example",
	url: "https://appkitexampleapp.com", // origin must match your domain & subdomain
	icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// Create the modal (networks include Arc from config)
createAppKit({
	adapters: [wagmiAdapter],
	projectId,
	networks,
	defaultNetwork: baseSepolia,
	metadata: metadata,
	features: {
		analytics: true, // Optional - defaults to your Cloud configuration
	},
});

const { networkConfig: suiNetworkConfig } = createNetworkConfig({
	mainnet: { url: getJsonRpcFullnodeUrl("mainnet"), network: "mainnet" },
	testnet: { url: getJsonRpcFullnodeUrl("testnet"), network: "testnet" },
});

function ContextProvider({
	children,
	cookies,
}: {
	children: ReactNode;
	cookies: string | null;
}) {
	const initialState = cookieToInitialState(
		wagmiAdapter.wagmiConfig as Config,
		cookies,
	);
	const defaultSuiNetwork = getSuiNetwork();

	return (
		<WagmiProvider
			config={wagmiAdapter.wagmiConfig as Config}
			initialState={initialState}
		>
			<QueryClientProvider client={queryClient}>
				<SuiClientProvider
					networks={suiNetworkConfig}
					defaultNetwork={defaultSuiNetwork}
				>
					<WalletProvider>{children}</WalletProvider>
				</SuiClientProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
}

export default ContextProvider;
