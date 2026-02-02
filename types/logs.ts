export const INSTALL_LOG_EVENT_TYPES = [
  "install_attempt",
  "payment_required_x402",
  "payment_completed",
  "install_success",
] as const;

export type InstallLogEventType = (typeof INSTALL_LOG_EVENT_TYPES)[number];

export type InstallLogStatus = "success" | "failed";

export interface InstallLogEntry {
  id: string;
  timestamp: string; // ISO
  packageName: string;
  eventType: InstallLogEventType;
  amount: number | null; // if paid
  status: InstallLogStatus;
  projectId: string;
}

export const EVENT_TYPE_LABELS: Record<InstallLogEventType, string> = {
  install_attempt: "Install attempt",
  payment_required_x402: "Payment required (x402)",
  payment_completed: "Payment completed",
  install_success: "Install success",
};
