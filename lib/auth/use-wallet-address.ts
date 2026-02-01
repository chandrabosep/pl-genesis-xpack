"use client";

import { useAccount } from "wagmi";

export function useWalletAddress(): string | null {
	const { address, isConnected } = useAccount();

	if (!isConnected || !address) {
		return null;
	}

	return address.toLowerCase();
}
