import { cookieStorage, createStorage } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { base, defineChain, type AppKitNetwork } from "@reown/appkit/networks";

// Helper to define a custom chain for AppKit/wagmi (required for switchChain to work).
// rpcUrl can be a single URL or array of URLs (viem will try fallbacks when one fails).
function customChain(
	id: number,
	name: string,
	rpcUrl: string | string[],
	explorerUrl: string,
	native: { name: string; symbol: string; decimals: number } = { name: "Ether", symbol: "ETH", decimals: 18 },
) {
	const http = Array.isArray(rpcUrl) ? rpcUrl : [rpcUrl];
	return defineChain({
		id,
		name,
		chainNamespace: "eip155" as const,
		caipNetworkId: `eip155:${id}`,
		nativeCurrency: native,
		rpcUrls: { default: { http } },
		blockExplorers: { default: { name: name, url: explorerUrl } },
	});
}

// Infura: when NEXT_PUBLIC_INFURA_PROJECT_ID is set, use it for Ethereum Sepolia and Base Sepolia
const infuraProjectId =
	typeof process.env.NEXT_PUBLIC_INFURA_PROJECT_ID === "string" &&
	process.env.NEXT_PUBLIC_INFURA_PROJECT_ID.trim().length > 0
		? process.env.NEXT_PUBLIC_INFURA_PROJECT_ID.trim()
		: undefined;
const ethereumSepoliaRpc =
	process.env.NEXT_PUBLIC_ETHEREUM_SEPOLIA_RPC ??
	(infuraProjectId ? `https://sepolia.infura.io/v3/${infuraProjectId}` : undefined) ??
	"https://rpc.sepolia.org";
const baseSepoliaRpc =
	process.env.NEXT_PUBLIC_RPC_URL ??
	(infuraProjectId ? `https://base-sepolia.infura.io/v3/${infuraProjectId}` : undefined) ??
	"https://sepolia.base.org";

// Supported EVM testnets (must be in wagmi config for switchChain)
const ethereumSepolia = customChain(
	11155111,
	"Ethereum Sepolia",
	ethereumSepoliaRpc,
	"https://sepolia.etherscan.io",
);
// Avalanche Fuji: Infura when project ID set (Fuji enabled in Infura dashboard), else public + fallbacks
const avalancheFujiPublicFallbacks = [
	"https://api.avax-test.network/ext/bc/C/rpc",
	"https://avalanche-fuji.drpc.org",
	"https://avalanche-fuji-c-chain-rpc.publicnode.com",
	"https://ava-testnet.public.blastapi.io/ext/bc/C/rpc",
	"https://endpoints.omniatech.io/v1/avax/fuji/public",
];
const avalancheFujiRpcUrls = process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC
	? process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC.split(",").map((u) => u.trim()).filter(Boolean)
	: infuraProjectId
		? [`https://avalanche-fuji.infura.io/v3/${infuraProjectId}`, ...avalancheFujiPublicFallbacks]
		: avalancheFujiPublicFallbacks;
const avalancheFuji = customChain(
	43113,
	"Avalanche Fuji",
	avalancheFujiRpcUrls.length > 0 ? avalancheFujiRpcUrls : avalancheFujiPublicFallbacks,
	"https://testnet.snowtrace.io",
);
// Sonic Testnet: use Infura (Fantom Sonic Testnet) when project ID set, else public fallbacks
const sonicTestnetRpcUrls =
	process.env.NEXT_PUBLIC_SONIC_TESTNET_RPC
		? process.env.NEXT_PUBLIC_SONIC_TESTNET_RPC.split(",").map((u) => u.trim()).filter(Boolean)
		: infuraProjectId
			? [`https://fantom-sonic-testnet.infura.io/v3/${infuraProjectId}`]
			: [
					"https://testnet.soniclabs.com",
					"https://64165.rpc.thirdweb.com",
					"https://rpc.testnet.soniclabs.com",
				];
const sonicTestnet = customChain(
	64165,
	"Sonic Testnet",
	sonicTestnetRpcUrls.length > 0 ? sonicTestnetRpcUrls : ["https://testnet.soniclabs.com"],
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
// Base Sepolia: use Infura when NEXT_PUBLIC_INFURA_PROJECT_ID is set
const baseSepolia = customChain(
	84532,
	"Base Sepolia",
	baseSepoliaRpc,
	"https://sepolia.basescan.org",
);

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
