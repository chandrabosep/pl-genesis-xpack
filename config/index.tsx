import { cookieStorage, createStorage } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
	base,
	baseSepolia,
	defineChain,
	type AppKitNetwork,
} from "@reown/appkit/networks";

// Arc testnet (Circle L1) for multi-chain USDC payments — use AppKit defineChain so it satisfies AppKitNetwork
const arcTestnet = defineChain({
	id: 5042002,
	name: "Arc",
	chainNamespace: "eip155" as const,
	caipNetworkId: "eip155:5042002",
	nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
	rpcUrls: {
		default: {
			http: [process.env.NEXT_PUBLIC_ARC_TESTNET_RPC ?? "https://arc-testnet.drpc.org"],
		},
	},
	blockExplorers: {
		default: { name: "Arcscan", url: "https://testnet.arcscan.app" },
	},
});

// Get projectId from https://dashboard.reown.com
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "";

if (!projectId) {
	throw new Error("Project ID is not defined");
}

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
	base,
	baseSepolia,
	arcTestnet,
];

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
	storage: createStorage({
		storage: cookieStorage,
	}),
	ssr: true,
	projectId,
	networks,
});

export const config = wagmiAdapter.wagmiConfig;
