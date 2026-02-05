/**
 * Circle Gateway API client: balances and transfer (attestation) requests.
 * Enables chain-abstracted USDC (e.g. pay from Base Sepolia → receive on Arc).
 * @see https://developers.circle.com/gateway
 */

import { pad, zeroAddress, maxUint256, type Hex } from "viem";
import {
	GATEWAY_WALLET_ADDRESS,
	GATEWAY_MINTER_ADDRESS,
	GATEWAY_API_BASE,
	getGatewayDomainId,
} from "./gateway-config";
import { getChainConfig } from "@/lib/x402/payment-config";
import { randomBytes } from "crypto";

const EIP712_DOMAIN = {
	name: "GatewayWallet",
	version: "1",
} as const;

const TransferSpec = [
	{ name: "version", type: "uint32" },
	{ name: "sourceDomain", type: "uint32" },
	{ name: "destinationDomain", type: "uint32" },
	{ name: "sourceContract", type: "bytes32" },
	{ name: "destinationContract", type: "bytes32" },
	{ name: "sourceToken", type: "bytes32" },
	{ name: "destinationToken", type: "bytes32" },
	{ name: "sourceDepositor", type: "bytes32" },
	{ name: "destinationRecipient", type: "bytes32" },
	{ name: "sourceSigner", type: "bytes32" },
	{ name: "destinationCaller", type: "bytes32" },
	{ name: "value", type: "uint256" },
	{ name: "salt", type: "bytes32" },
	{ name: "hookData", type: "bytes" },
] as const;

const BurnIntent = [
	{ name: "maxBlockHeight", type: "uint256" },
	{ name: "maxFee", type: "uint256" },
	{ name: "spec", type: "TransferSpec" },
] as const;

const EIP712Domain = [
	{ name: "name", type: "string" },
	{ name: "version", type: "string" },
] as const;

function addressToBytes32(address: string): Hex {
	return pad((address.toLowerCase().startsWith("0x") ? address : "0x" + address) as Hex, {
		size: 32,
	});
}

export type BurnIntentMessage = {
	maxBlockHeight: bigint;
	maxFee: bigint;
	spec: {
		version: number;
		sourceDomain: number;
		destinationDomain: number;
		sourceContract: Hex;
		destinationContract: Hex;
		sourceToken: Hex;
		destinationToken: Hex;
		sourceDepositor: Hex;
		destinationRecipient: Hex;
		sourceSigner: Hex;
		destinationCaller: Hex;
		value: bigint;
		salt: Hex;
		hookData: Hex;
	};
};

/** EIP-712 typed data for Gateway burn intent; pass to signTypedData (e.g. viem/wallet). */
export type BurnIntentTypedData = {
	domain: typeof EIP712_DOMAIN;
	types: { EIP712Domain: typeof EIP712Domain; TransferSpec: typeof TransferSpec; BurnIntent: typeof BurnIntent };
	primaryType: "BurnIntent";
	message: BurnIntentMessage;
};

/**
 * Build EIP-712 typed data for a Gateway burn intent (for client-side signing).
 * Use with signTypedData; then send the signed message + signature to attestation API.
 */
export function buildBurnIntentTypedData(params: {
	sourceChainId: number;
	destinationChainId: number;
	sourceDepositor: string;
	destinationRecipient: string;
	valueUnits: bigint;
	salt?: Hex;
	maxFee?: bigint;
}): { typedData: BurnIntentTypedData; message: BurnIntentMessage } {
	const {
		sourceChainId,
		destinationChainId,
		sourceDepositor,
		destinationRecipient,
		valueUnits,
		salt = ("0x" + randomBytes(32).toString("hex")) as Hex,
		maxFee = BigInt(2010000),
	} = params;

	const sourceDomain = getGatewayDomainId(sourceChainId);
	const destDomain = getGatewayDomainId(destinationChainId);
	const sourceConfig = getChainConfig(sourceChainId);
	const destConfig = getChainConfig(destinationChainId);

	if (sourceDomain == null || destDomain == null || !sourceConfig || !destConfig) {
		throw new Error("Unsupported chain for Gateway");
	}

	const spec = {
		version: 1,
		sourceDomain,
		destinationDomain: destDomain,
		sourceContract: addressToBytes32(GATEWAY_WALLET_ADDRESS),
		destinationContract: addressToBytes32(GATEWAY_MINTER_ADDRESS),
		sourceToken: addressToBytes32(sourceConfig.usdcAddress),
		destinationToken: addressToBytes32(destConfig.usdcAddress),
		sourceDepositor: addressToBytes32(sourceDepositor),
		destinationRecipient: addressToBytes32(destinationRecipient),
		sourceSigner: addressToBytes32(sourceDepositor),
		destinationCaller: addressToBytes32(zeroAddress),
		value: valueUnits,
		salt,
		hookData: "0x" as Hex,
	};

	const message: BurnIntentMessage = {
		maxBlockHeight: maxUint256,
		maxFee,
		spec,
	};

	const typedData = {
		types: { EIP712Domain, TransferSpec, BurnIntent },
		domain: EIP712_DOMAIN,
		primaryType: "BurnIntent" as const,
		message,
	};

	return { typedData, message };
}

/**
 * Request attestation from Circle Gateway API (server-side).
 * Call after user has signed the burn intent; returns attestation + signature for gatewayMint().
 */
export async function requestAttestation(params: {
	burnIntent: BurnIntentMessage;
	signature: Hex;
}): Promise<{ attestation: string; signature: string }> {
	const { burnIntent, signature } = params;
	const body = [
		{
			burnIntent: serializeBurnIntentForApi(burnIntent),
			signature: signature.startsWith("0x") ? signature : `0x${signature}`,
		},
	];

	const res = await fetch(`${GATEWAY_API_BASE}/v1/transfer`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body, (_, v) =>
			typeof v === "bigint" ? v.toString() : v,
		),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Gateway API error: ${res.status} ${text}`);
	}

	const json = (await res.json()) as {
		attestation?: string;
		signature?: string;
	};
	if (!json.attestation || !json.signature) {
		throw new Error("Missing attestation or signature in Gateway response");
	}
	return { attestation: json.attestation, signature: json.signature };
}

function serializeBurnIntentForApi(msg: BurnIntentMessage): Record<string, unknown> {
	return {
		maxBlockHeight: msg.maxBlockHeight.toString(),
		maxFee: msg.maxFee.toString(),
		spec: {
			version: msg.spec.version,
			sourceDomain: msg.spec.sourceDomain,
			destinationDomain: msg.spec.destinationDomain,
			sourceContract: msg.spec.sourceContract,
			destinationContract: msg.spec.destinationContract,
			sourceToken: msg.spec.sourceToken,
			destinationToken: msg.spec.destinationToken,
			sourceDepositor: msg.spec.sourceDepositor,
			destinationRecipient: msg.spec.destinationRecipient,
			sourceSigner: msg.spec.sourceSigner,
			destinationCaller: msg.spec.destinationCaller,
			value: msg.spec.value.toString(),
			salt: msg.spec.salt,
			hookData: msg.spec.hookData,
		},
	};
}

/**
 * Fetch Gateway unified USDC balances for a depositor (optional, for UI).
 */
export async function getGatewayBalances(params: {
	depositor: string;
	domains?: number[];
}): Promise<{ domain: number; balance: string }[]> {
	const { depositor, domains = [6, 26] } = params;
	const body = {
		token: "USDC",
		sources: domains.map((domain) => ({ domain, depositor })),
	};
	const res = await fetch(`${GATEWAY_API_BASE}/v1/balances`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Gateway balances error: ${res.status} ${text}`);
	}
	const json = (await res.json()) as { balances?: { domain: number; balance: string }[] };
	return json.balances ?? [];
}

export { GATEWAY_MINTER_ADDRESS, GATEWAY_WALLET_ADDRESS };
