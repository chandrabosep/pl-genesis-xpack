import { BillingOverview } from "@/types/billing";
import { prisma } from "@/lib/prisma/client";
import { getOrCreateDeveloper } from "@/lib/auth/wallet-auth";

export async function getBillingOverview(
  projectId: string,
  walletAddress: string,
): Promise<BillingOverview> {
  if (!projectId) {
    throw new Error("projectId is required");
  }

  const developer = await getOrCreateDeveloper(walletAddress);

  const project = await prisma.project.findFirst({
    where: { id: projectId, developerId: developer.id },
  });

  if (!project) {
    throw new Error("Project not found or access denied");
  }

  const [receipts, entitlements, activeSubscriptions] = await Promise.all([
    prisma.receipt.count({ where: { projectId } }),
    prisma.entitlement.count({ where: { projectId } }),
    prisma.entitlement.count({
      where: { projectId, expiresAt: { gt: new Date() } },
    }),
  ]);

  return { receipts, entitlements, activeSubscriptions };
}

