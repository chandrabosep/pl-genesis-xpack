import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Shorten an address for display (e.g. 0x1234...5678). */
export function shortenAddress(address: string, head = 6, tail = 4): string {
  if (!address || address.length <= head + tail) return address
  return `${address.slice(0, head)}...${address.slice(-tail)}`
}

/** Format ISO date string for display. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
