"use client";

import { useState, useEffect, useCallback } from "react";
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
  Plus,
  KeyRound,
  Pencil,
  Trash2,
  Copy,
  Loader2,
  Package,
} from "lucide-react";

export default function DashboardPage() {
  const walletAddress = useWalletAddress();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  if (!walletAddress) {
    return (
      <main className="min-h-[60vh] flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-md space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Package className="size-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold">API Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Connect your wallet to view and manage your packages and API keys.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage packages and API keys for your integrations.
          </p>
        </div>
        <CreatePackageButton
          walletAddress={walletAddress}
          onCreated={fetchProjects}
        />
      </header>

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
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
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
              onCreated={fetchProjects}
              variant="inline"
            />
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 list-none p-0 m-0">
            {projects.map((project) => (
              <li key={project.id}>
                <PackageCard
                  project={project}
                  walletAddress={walletAddress}
                  onUpdated={fetchProjects}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function CreatePackageButton(props: {
  walletAddress: string;
  onCreated: () => void;
  variant?: "default" | "inline";
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("10");
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
        setOpen(false);
        setName("");
        setPrice("10");
        setPaymentAddress("");
        setPricingModel("one_time");
        props.onCreated();
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
        {message ? (
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
}) {
  const { project, walletAddress, onUpdated } = props;
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

  return (
    <>
      <Card className="flex flex-col h-full">
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
            <CardTitle className="text-base font-medium leading-tight">
              {project.name}
            </CardTitle>
            <Badge variant="secondary" className="shrink-0 text-xs font-normal">
              {project.pricingModel}
            </Badge>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Price:</span>{" "}
              {project.price ?? 0} USDC
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Payment address:</span>{" "}
              <span className="break-all font-mono">{project.paymentAddress}</span>
            </div>
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
      </Card>

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
              <Label htmlFor="payment-address">Payment address (Base USDC)</Label>
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
