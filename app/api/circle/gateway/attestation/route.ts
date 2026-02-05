import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requestAttestation, buildBurnIntentTypedData } from "@/lib/circle/gateway";
import { getGatewayDomainId } from "@/lib/circle/gateway-config";
import {
	ARC_TESTNET_CHAIN_ID,
	BASE_SEPOLIA_CHAIN_ID,
	SUPPORTED_CHAINS,
	isSupportedChain,
} from "@/lib/x402/payment-config";
import { parseUnits, pad } from "viem";

/** Serialize typed data message for JSON (bigint -> string). */
function serializeTypedDataForClient(typedData: {
	types: unknown;
	domain: unknown;
	primaryType: string;
	message: Record<string, unknown>;
}) {
	return {
		...typedData,
		message: JSON.parse(
			JSON.stringify(typedData.message, (_, v) =>
				typeof v === "bigint" ? v.toString() : v,
			),
		),
	};
}

/**
 * GET: Return burn intent typed data for this session (client signs it, then POSTs to get attestation).
 * Query: session, depositor (payer's 0x address), sourceChainId (optional, default Base Sepolia), destinationChainId (optional, default Arc).
 */
export async function GET(request: NextRequest) {
	try {
		const sessionToken = request.nextUrl.searchParams.get("session")?.trim();
		const depositor = request.nextUrl.searchParams.get("depositor")?.trim();
		const sourceChainIdParam = request.nextUrl.searchParams.get("sourceChainId");
		const destinationChainIdParam = request.nextUrl.searchParams.get("destinationChainId");
		const sourceChainId = sourceChainIdParam
			? Number(sourceChainIdParam)
			: BASE_SEPOLIA_CHAIN_ID;
		const destinationChainId = destinationChainIdParam
			? Number(destinationChainIdParam)
			: ARC_TESTNET_CHAIN_ID;

		if (!sessionToken || !depositor) {
			return NextResponse.json(
				{ error: "session and depositor query are required" },
				{ status: 400 }
			);
		}
		if (!/^0x[a-fA-F0-9]{40}$/.test(depositor)) {
			return NextResponse.json(
				{ error: "depositor must be a valid 0x address" },
				{ status: 400 }
			);
		}
		if (!isSupportedChain(sourceChainId)) {
			return NextResponse.json(
				{ error: `Unsupported source chain: ${sourceChainId}` },
				{ status: 400 }
			);
		}
		if (!isSupportedChain(destinationChainId)) {
			return NextResponse.json(
				{ error: `Unsupported destination chain: ${destinationChainId}` },
				{ status: 400 }
			);
		}
		if (getGatewayDomainId(destinationChainId) == null) {
			return NextResponse.json(
				{ error: "Destination chain is not a Gateway chain" },
				{ status: 400 }
			);
		}

		const attempt = await prisma.installAttempt.findUnique({
			where: { sessionToken },
			include: {
				project: { include: { pricingRules: { orderBy: { id: "asc" }, take: 1 } } },
			},
		});

		if (!attempt || attempt.status !== "payment_required") {
			return NextResponse.json(
				{ error: "Invalid or expired session" },
				{ status: 400 }
			);
		}

		const project = attempt.project as {
			receiveMode?: string | null;
			unifiedReceiveAddress?: string | null;
			paymentAddress: string;
			pricingRules: { amount: number }[];
		};
		const receiveMode = project.receiveMode ?? "base";
		const unified = project.unifiedReceiveAddress?.trim();
		const recipient =
			receiveMode === "any_chain" && unified ? unified : project.paymentAddress;
		const price = project.pricingRules[0]?.amount ?? 0;
		const expectedUnits = parseUnits(String(price), 6);

		const { typedData, message } = buildBurnIntentTypedData({
			sourceChainId,
			destinationChainId,
			sourceDepositor: depositor,
			destinationRecipient: recipient,
			valueUnits: expectedUnits,
		});

		// Return typed data; sourceDepositor/sourceSigner will be set by client to their wallet
		return NextResponse.json({
			typedData: serializeTypedDataForClient(typedData),
			message: JSON.parse(
				JSON.stringify(message, (_, v) =>
					typeof v === "bigint" ? v.toString() : v,
				),
			),
			destinationChainId,
			recipient,
			amountUnits: expectedUnits.toString(),
			sourceChainId,
		});
	} catch (err) {
		console.error("[gateway/attestation GET]", err);
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Failed to build burn intent" },
			{ status: 500 }
		);
	}
}

/**
 * POST: Request a Circle Gateway attestation for a session payment.
 * Body: { sessionToken, burnIntent, signature }.
 * burnIntent must be for destination Arc and recipient = session's receive address; value = session price.
 * Returns { attestation, signature } for the client to call gatewayMint() on Arc.
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { sessionToken, burnIntent, signature } = body as {
			sessionToken?: string;
			burnIntent?: {
				maxBlockHeight: string;
				maxFee: string;
				spec: {
					destinationDomain: number;
					destinationRecipient: string;
					value: string;
					[key: string]: unknown;
				};
			};
			signature?: string;
		};

		if (!sessionToken?.trim() || !burnIntent || !signature) {
			return NextResponse.json(
				{ error: "sessionToken, burnIntent, and signature are required" },
				{ status: 400 }
			);
		}

		const attempt = await prisma.installAttempt.findUnique({
			where: { sessionToken: sessionToken.trim() },
			include: {
				project: { include: { pricingRules: { orderBy: { id: "asc" }, take: 1 } } },
			},
		});

		if (!attempt || attempt.status !== "payment_required") {
			return NextResponse.json(
				{ error: "Invalid or expired session" },
				{ status: 400 }
			);
		}

		const project = attempt.project as {
			receiveMode?: string | null;
			unifiedReceiveAddress?: string | null;
			paymentAddress: string;
			pricingRules: { amount: number }[];
		};
		const receiveMode = project.receiveMode ?? "base";
		const unified = project.unifiedReceiveAddress?.trim();
		const recipient =
			receiveMode === "any_chain" && unified ? unified : project.paymentAddress;
		const price = project.pricingRules[0]?.amount ?? 0;
		const expectedUnits = parseUnits(String(price), 6);

		// Validate burn intent: destination must be a supported Gateway chain, recipient matches, value matches
		const destDomain = burnIntent.spec?.destinationDomain;
		const destRecipientBytes = burnIntent.spec?.destinationRecipient;
		const valueStr = burnIntent.spec?.value;

		// Resolve expected destination chain from domain (any supported chain with this domain)
		const expectedDestChainId = SUPPORTED_CHAINS.find(
			(c) => getGatewayDomainId(c.chainId) === destDomain
		)?.chainId ?? null;
		if (expectedDestChainId == null) {
			return NextResponse.json(
				{ error: "Unsupported destination domain for this payment" },
				{ status: 400 }
			);
		}

		const wantRecipientBytes = pad(
			(recipient.startsWith("0x") ? recipient : "0x" + recipient).toLowerCase() as `0x${string}`,
			{ size: 32 }
		);
		const recHex =
			typeof destRecipientBytes === "string" && destRecipientBytes.startsWith("0x")
				? destRecipientBytes
				: "0x" + destRecipientBytes;
		if (recHex.toLowerCase() !== wantRecipientBytes.toLowerCase()) {
			return NextResponse.json(
				{ error: "Burn intent recipient does not match session" },
				{ status: 400 }
			);
		}

		const value = BigInt(valueStr ?? "0");
		if (value < expectedUnits) {
			return NextResponse.json(
				{ error: "Burn intent amount is less than required" },
				{ status: 400 }
			);
		}

		// Rebuild message for requestAttestation (expects BurnIntentMessage with bigints)
		const message = {
			maxBlockHeight: BigInt(burnIntent.maxBlockHeight ?? "0"),
			maxFee: BigInt(burnIntent.maxFee ?? "0"),
			spec: {
				version: (burnIntent.spec as { version?: number }).version ?? 1,
				sourceDomain: (burnIntent.spec as { sourceDomain?: number }).sourceDomain ?? 0,
				destinationDomain: burnIntent.spec.destinationDomain,
				sourceContract: (burnIntent.spec as { sourceContract?: `0x${string}` })
					.sourceContract as `0x${string}`,
				destinationContract: (burnIntent.spec as { destinationContract?: `0x${string}` })
					.destinationContract as `0x${string}`,
				sourceToken: (burnIntent.spec as { sourceToken?: `0x${string}` }).sourceToken as `0x${string}`,
				destinationToken: (burnIntent.spec as { destinationToken?: `0x${string}` })
					.destinationToken as `0x${string}`,
				sourceDepositor: (burnIntent.spec as { sourceDepositor?: `0x${string}` })
					.sourceDepositor as `0x${string}`,
				destinationRecipient: wantRecipientBytes,
				sourceSigner: (burnIntent.spec as { sourceSigner?: `0x${string}` }).sourceSigner as `0x${string}`,
				destinationCaller: (burnIntent.spec as { destinationCaller?: `0x${string}` })
					.destinationCaller as `0x${string}`,
				value,
				salt: (burnIntent.spec as { salt?: `0x${string}` }).salt ?? ("0x" as `0x${string}`),
				hookData: (burnIntent.spec as { hookData?: `0x${string}` }).hookData ?? ("0x" as `0x${string}`),
			},
		};

		const sigHex = signature.startsWith("0x") ? signature : "0x" + signature;
		const result = await requestAttestation({
			burnIntent: message,
			signature: sigHex as `0x${string}`,
		});

		return NextResponse.json({
			attestation: result.attestation,
			signature: result.signature,
			destinationChainId: expectedDestChainId,
		});
	} catch (err) {
		console.error("[gateway/attestation]", err);
		const message = err instanceof Error ? err.message : "Attestation failed";
		if (message.includes("Insufficient balance")) {
			return NextResponse.json(
				{
					error:
						"You don’t have enough USDC in your Circle Gateway balance. Deposit USDC into the Gateway Wallet on any supported chain first (e.g. via Circle Faucet and Gateway deposit).",
					helpUrl: "https://developers.circle.com/gateway/quickstarts/unified-balance",
				},
				{ status: 400 }
			);
		}
		return NextResponse.json(
			{ error: message },
			{ status: 500 }
		);
	}
}
