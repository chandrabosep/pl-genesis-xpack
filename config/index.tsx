import { cookieStorage, createStorage } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
	base,
	baseSepolia,
	defineChain,
	type AppKitNetwork,
} from "@reown/appkit/networks";

// Helper to define a custom chain for AppKit/wagmi (required for switchChain to work)
function customChain(
	id: number,
	name: string,
	rpcUrl: string,
	explorerUrl: string,
	native: { name: string; symbol: string; decimals: number } = { name: "Ether", symbol: "ETH", decimals: 18 },
) {
	return defineChain({
		id,
		name,
		chainNamespace: "eip155" as const,
		caipNetworkId: `eip155:${id}`,
		nativeCurrency: native,
		rpcUrls: { default: { http: [rpcUrl] } },
		blockExplorers: { default: { name: name, url: explorerUrl } },
	});
}

// Circle Gateway–supported testnets (must be in wagmi config for switchChain)
const ethereumSepolia = customChain(
	11155111,
	"Ethereum Sepolia",
	process.env.NEXT_PUBLIC_ETHEREUM_SEPOLIA_RPC ?? "https://rpc.sepolia.org",
	"https://sepolia.etherscan.io",
);
const avalancheFuji = customChain(
	43113,
	"Avalanche Fuji",
	process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC ?? "https://api.avax-test.network/ext/bc/C/rpc",
	"https://testnet.snowtrace.io",
);
const sonicTestnet = customChain(
	64165,
	"Sonic Testnet",
	process.env.NEXT_PUBLIC_SONIC_TESTNET_RPC ?? "https://testnet.soniclabs.com",
	"https://testnet.sonicscan.org",
);
const worldChainSepolia = customChain(
	4801,
	"World Chain Sepolia",
	process.env.NEXT_PUBLIC_WORLD_CHAIN_SEPOLIA_RPC ?? "https://worldchain-sepolia.g.alchemy.com/public",
	"https://sepolia.worldscan.org",
);
const seiAtlantic = customChain(
	1329,
	"Sei Atlantic",
	process.env.NEXT_PUBLIC_SEI_ATLANTIC_RPC ?? "https://evm.atlantic-2.seinetwork.io",
	"https://seitrace.com",
);
const hyperevmTestnet = customChain(
	998,
	"HyperEVM Testnet",
	process.env.NEXT_PUBLIC_HYPEREVM_TESTNET_RPC ?? "https://testnet.rpc.hyperlane.xyz",
	"https://testnet.purrsec.com",
);
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
	ethereumSepolia,
	avalancheFuji,
	sonicTestnet,
	worldChainSepolia,
	seiAtlantic,
	hyperevmTestnet,
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
