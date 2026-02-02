"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWalletAddress } from "@/lib/auth/use-wallet-address";
import { PricingModel } from "@/types/constants";
import type { ProjectSummary } from "@/types/projects";
import { ProjectForm } from "@/components/projects/project-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Plus,
  KeyRound,
  Pencil,
  Trash2,
  Copy,
  Loader2,
  Package,
  FolderKanban,
  Download,
  DollarSign,
  ExternalLink,
} from "lucide-react";

type DashboardStats = {
  activeProjects: number;
  installs: number;
  totalPayments: number;
};

function pricingModelLabel(model: PricingModel): string {
  const labels: Record<PricingModel, string> = {
    one_time: "One-time",
    subscription: "Subscription",
    per_device: "Per device",
    per_version: "Per version",
  };
  return labels[model] ?? model;
}

export default function DashboardPage() {
  const walletAddress = useWalletAddress();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  const fetchProjects = useCallback(async () => {
    if (!walletAddress) {
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        headers: { "x-wallet-address": walletAddress },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to load projects");
      }
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch (e) {
      setError((e as Error).message);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  const fetchStats = useCallback(async () => {
    if (!walletAddress) {
      setStats(null);
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProjectId) params.set("projectId", filterProjectId);
      if (filterDateFrom) params.set("dateFrom", filterDateFrom);
      if (filterDateTo) params.set("dateTo", filterDateTo);
      const res = await fetch(`/api/dashboard/stats?${params}`, {
        headers: { "x-wallet-address": walletAddress },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to load stats");
      }
      const data = await res.json();
      setStats(data);
    } catch {
      setStats({ activeProjects: 0, installs: 0, totalPayments: 0 });
    } finally {
      setStatsLoading(false);
    }
  }, [walletAddress, filterProjectId, filterDateFrom, filterDateTo]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const clearFilters = () => {
    setFilterProjectId("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const hasActiveFilters = filterProjectId || filterDateFrom || filterDateTo;

  if (!walletAddress) {
    return (
      <main className="min-h-[60vh] flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-md space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Package className="size-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Connect your wallet to view analytics and manage your packages.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How is my monetization doing at a glance?
          </p>
        </div>
        <CreatePackageButton
          walletAddress={walletAddress}
          onCreated={() => {
            fetchProjects();
            fetchStats();
          }}
        />
      </header>

      {/* Stats cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active projects
            </CardTitle>
            <FolderKanban className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 w-20 bg-muted rounded animate-pulse" />
            ) : (
              <span className="text-2xl font-semibold">
                {stats?.activeProjects ?? 0}
              </span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Successful installs
            </CardTitle>
            <Download className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 w-20 bg-muted rounded animate-pulse" />
            ) : (
              <span className="text-2xl font-semibold">
                {stats?.installs ?? 0}
              </span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total revenue
            </CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
                <div className="h-8 w-20 bg-muted rounded animate-pulse" />
            ) : (
              <span className="text-2xl font-semibold">
                {(stats?.totalPayments ?? 0).toLocaleString()} USDC
              </span>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-3 py-2">
        <Select
          value={filterProjectId || "all"}
          onValueChange={(v) => setFilterProjectId(v === "all" ? "" : v)}
        >
          <SelectTrigger id="filter-project" className="h-8 w-[160px] border-muted-foreground/20">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground/50">|</span>
        <DateRangePicker
          dateFrom={filterDateFrom}
          dateTo={filterDateTo}
          onRangeChange={(from, to) => {
            setFilterDateFrom(from);
            setFilterDateTo(to);
          }}
          placeholder="dd/mm/yyyy"
        />
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        ) : null}
      </section>

      {error ? (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          data-testid="dashboard-error"
        >
          {error}
        </div>
      ) : null}

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Packages</h2>
        {loading ? (
          <div className="flex items-center justify-center border border-border rounded-lg p-4">
            <div className="flex flex-col gap-3 w-full">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse flex items-center gap-4 px-4 py-3 border-b last:border-b-0"
                >
                  <div className="h-8 w-8 rounded bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 w-1/3 bg-muted rounded mb-2"></div>
                    <div className="h-3 w-1/4 bg-muted rounded"></div>
                  </div>
                  <div className="h-6 w-16 bg-muted rounded" />
                  <div className="h-6 w-12 bg-muted rounded" />
                  <div className="h-6 w-20 bg-muted rounded ml-auto" />
                </div>
              ))}
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 py-16 text-center">
            <Package className="mx-auto size-10 text-muted-foreground/70" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              No packages yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
              Create your first package to get an API key and start integrating.
            </p>
            <CreatePackageButton
              walletAddress={walletAddress}
              onCreated={() => {
                fetchProjects();
                fetchStats();
              }}
              variant="inline"
            />
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left font-medium py-3 px-4">Package name</th>
                    <th className="text-left font-medium py-3 px-4">Pricing model</th>
                    <th className="text-left font-medium py-3 px-4">Price</th>
                    <th className="text-left font-medium py-3 px-4">Status</th>
                    <th className="text-right font-medium py-3 px-4">Quick actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <PackageRow
                      key={project.id}
                      project={project}
                      walletAddress={walletAddress}
                      onUpdated={() => {
                        fetchProjects();
                        fetchStats();
                      }}
                      pricingModelLabel={pricingModelLabel(project.pricingModel)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </main>
  );
}

function PackageRow(props: {
  project: ProjectSummary;
  walletAddress: string;
  onUpdated: () => void;
  pricingModelLabel: string;
}) {
  const { project, walletAddress, onUpdated, pricingModelLabel } = props;
  const [copied, setCopied] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const copyKey = () => {
    if (project.apiKeyValue) {
      void navigator.clipboard.writeText(project.apiKeyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-muted/20 transition-colors">
        <td className="py-3 px-4 font-medium">{project.name}</td>
        <td className="py-3 px-4 text-muted-foreground">{pricingModelLabel}</td>
        <td className="py-3 px-4">{project.price ?? 0} USDC</td>
        <td className="py-3 px-4">
          <Badge variant="secondary" className="text-xs font-normal">
            Active
          </Badge>
        </td>
        <td className="py-3 px-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyKey}
              className="h-8 text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                "Copied"
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Copy API key
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewOpen(true)}
              className="h-8 text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3.5" />
              View project
            </Button>
          </div>
        </td>
      </tr>
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{project.name}</DialogTitle>
          </DialogHeader>
          <PackageCard
            project={project}
            walletAddress={walletAddress}
            onUpdated={() => {
              onUpdated();
              setViewOpen(false);
            }}
            embedded
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreatePackageButton(props: {
  walletAddress: string;
  onCreated: () => void;
  variant?: "default" | "inline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0.1");
  const [paymentAddress, setPaymentAddress] = useState("");
  const [pricingModel, setPricingModel] = useState<PricingModel>("one_time");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": props.walletAddress,
        },
        body: JSON.stringify({
          name,
          pricingModel,
          price: Number(price),
          paymentAddress,
        }),
      });
      if (res.ok) {
        const project = await res.json();
        setOpen(false);
        setName("");
        setPrice("0.1");
        setPaymentAddress("");
        setPricingModel("one_time");
        props.onCreated();
        router.push(`/projects/${project.id}`);
        return;
      }
      const data = await res.json();
      setMessage(data.error ?? "Failed to create package.");
    } finally {
      setSubmitting(false);
    }
  };

  const isInline = props.variant === "inline";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isInline ? (
        <Button
          variant="default"
          size="default"
          onClick={() => setOpen(true)}
          className="mt-4"
        >
          <Plus className="size-4" />
          Create package
        </Button>
      ) : (
        <Button
          variant="default"
          size="default"
          onClick={() => setOpen(true)}
        >
          <Plus className="size-4" />
          Create package
        </Button>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create package</DialogTitle>
        </DialogHeader>
        <ProjectForm
          name={name}
          price={price}
          paymentAddress={paymentAddress}
          pricingModel={pricingModel}
          onNameChange={setName}
          onPriceChange={setPrice}
          onPaymentAddressChange={setPaymentAddress}
          onPricingChange={setPricingModel}
          onSubmit={handleSubmit}
        />
        {submitting ? (
          <p className="text-sm text-muted-foreground">Creating…</p>
        ) : message ? (
          <p className="text-sm text-destructive">{message}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PackageCard(props: {
  project: ProjectSummary;
  walletAddress: string;
  onUpdated: () => void;
  embedded?: boolean;
}) {
  const { project, walletAddress, onUpdated, embedded = false } = props;
  const [rotateOpen, setRotateOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [updateAddressOpen, setUpdateAddressOpen] = useState(false);
  const [updateAddressValue, setUpdateAddressValue] = useState(project.paymentAddress);
  const [rotating, setRotating] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyKey = () => {
    if (project.apiKeyValue) {
      void navigator.clipboard.writeText(project.apiKeyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRotate = async () => {
    setRotating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ projectId: project.id }),
      });
      if (res.ok) {
        setRotateOpen(false);
        onUpdated();
        return;
      }
      const data = await res.json();
      alert(data.error ?? "Failed to rotate key.");
    } finally {
      setRotating(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch(`/api/projects?projectId=${encodeURIComponent(project.id)}`, {
        method: "DELETE",
        headers: { "x-wallet-address": walletAddress },
      });
      if (res.ok) {
        setRemoveOpen(false);
        onUpdated();
        return;
      }
      const data = await res.json();
      alert(data.error ?? "Failed to remove package.");
    } finally {
      setRemoving(false);
    }
  };

  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          projectId: project.id,
          paymentAddress: updateAddressValue,
        }),
      });
      if (res.ok) {
        setUpdateAddressOpen(false);
        onUpdated();
        return;
      }
      const data = await res.json();
      alert(data.error ?? "Failed to update address.");
    } finally {
      setUpdating(false);
    }
  };

  const content = (
    <>
      {!embedded && (
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
          <CardTitle className="text-base font-medium leading-tight">
            {project.name}
          </CardTitle>
          <Badge variant="secondary" className="shrink-0 text-xs font-normal">
            {project.pricingModel}
          </Badge>
        </CardHeader>
      )}
      <CardContent className={embedded ? "pt-0 space-y-3" : "flex-1 space-y-3"}>
        {embedded && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Pricing:</span>{" "}
            {pricingModelLabel(project.pricingModel)} · {project.price ?? 0} USDC
          </div>
        )}
        {!embedded && (
          <>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Price:</span>{" "}
              {project.price ?? 0} USDC
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Payment address:</span>{" "}
              <span className="break-all font-mono">{project.paymentAddress}</span>
            </div>
          </>
        )}
        {embedded && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Payment address:</span>{" "}
            <span className="break-all font-mono">{project.paymentAddress}</span>
          </div>
        )}
        {project.apiKeyValue ? (
          <div className="rounded-md border bg-muted/50 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                API key
              </span>
              <Button
                variant="ghost"
                size="xs"
                onClick={copyKey}
                className="shrink-0 h-6"
              >
                {copied ? (
                  "Copied"
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <code className="mt-1 block truncate text-xs font-mono text-foreground">
              {project.apiKeyValue}
            </code>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Project ID: {project.id}
            </p>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setUpdateAddressValue(project.paymentAddress);
            setUpdateAddressOpen(true);
          }}
        >
          <Pencil className="size-3.5" />
          Update address
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRotateOpen(true)}
        >
          <KeyRound className="size-3.5" />
          Rotate key
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setRemoveOpen(true)}
        >
          <Trash2 className="size-3.5" />
          Remove
        </Button>
      </CardFooter>
    </>
  );

  return (
    <>
      {embedded ? (
        <div className="space-y-0">{content}</div>
      ) : (
        <Card className="flex flex-col h-full">{content}</Card>
      )}

      <AlertDialog open={rotateOpen} onOpenChange={setRotateOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate API key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate your current API key. Any integrations or apps
              using the old key will stop working. A new key will be generated.
              Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rotating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleRotate();
              }}
              disabled={rotating}
            >
              {rotating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Rotating…
                </>
              ) : (
                "Rotate key"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove package?</AlertDialogTitle>
            <AlertDialogDescription>
              This package and its API keys will be permanently deleted. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                void handleRemove();
              }}
              disabled={removing}
            >
              {removing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Removing…
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={updateAddressOpen} onOpenChange={setUpdateAddressOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update payment address</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateAddress} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment-address">Payment address</Label>
              <Input
                id="payment-address"
                value={updateAddressValue}
                onChange={(e) => setUpdateAddressValue(e.target.value)}
                placeholder="0x..."
                required
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={updating}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={updating}>
                {updating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
