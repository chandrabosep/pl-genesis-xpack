import { prisma } from "@/lib/prisma/client";

export type DashboardStatsFilters = {
  projectId?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

export type DashboardStats = {
  activeProjects: number;
  installs: number;
  totalPayments: number;
};

export async function getDashboardStats(
  walletAddress: string,
  filters: DashboardStatsFilters = {}
): Promise<DashboardStats> {
  const normalized = walletAddress.trim().toLowerCase();
  const developer = await prisma.developer.findUnique({
    where: { walletAddress: normalized },
    select: { id: true },
  });

  if (!developer) {
    return { activeProjects: 0, installs: 0, totalPayments: 0 };
  }

  const projectWhere = {
    developerId: developer.id,
    ...(filters.projectId ? { id: filters.projectId } : {}),
  };

  const dateFilter =
    filters.dateFrom || filters.dateTo
      ? {
          ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
          ...(filters.dateTo ? { lte: filters.dateTo } : {}),
        }
      : undefined;

  const [activeProjects, installs, totalPaymentsResult] = await Promise.all([
    prisma.project.count({ where: projectWhere }),
    prisma.installAttempt.count({
      where: {
        project: projectWhere,
        status: "allowed",
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
    }),
    prisma.receipt.aggregate({
      where: {
        project: projectWhere,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    activeProjects,
    installs,
    totalPayments: totalPaymentsResult._sum.amount ?? 0,
  };
}
