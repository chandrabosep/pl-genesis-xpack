import { NextRequest, NextResponse } from "next/server";
import {
  createProject,
  deleteProject,
  listProjects,
  rotateApiKey,
  updateProject,
} from "@/lib/x402/project-service";
import {
  projectCreateSchema,
  projectRotateSchema,
  projectUpdateSchema,
} from "@/types/schemas";
import { requireWalletAddressFromHeaders } from "@/lib/auth/wallet-auth";

export async function GET(request: NextRequest) {
  try {
    const walletAddress = requireWalletAddressFromHeaders(request);
    const projects = await listProjects(walletAddress);
    return NextResponse.json({ projects });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const walletAddress = requireWalletAddressFromHeaders(request);
    const body = projectCreateSchema.parse(await request.json());
    const project = await createProject(body, walletAddress);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const walletAddress = requireWalletAddressFromHeaders(request);
    const body = await request.json();
    const hasUpdate =
      body.paymentAddress != null ||
      body.receiveMode != null ||
      body.unifiedReceiveAddress !== undefined ||
      body.suiAddress !== undefined ||
      body.starknetAddress !== undefined;
    if (hasUpdate) {
      const parsed = projectUpdateSchema.parse(body);
      const updates: Parameters<typeof updateProject>[1] = {};
      if (parsed.paymentAddress != null) updates.paymentAddress = parsed.paymentAddress;
      if (parsed.receiveMode != null) updates.receiveMode = parsed.receiveMode;
      if (parsed.unifiedReceiveAddress !== undefined)
        updates.unifiedReceiveAddress = parsed.unifiedReceiveAddress?.trim() || null;
      if (parsed.suiAddress !== undefined)
        updates.suiAddress = parsed.suiAddress?.trim() || null;
      if ((parsed as { starknetAddress?: string }).starknetAddress !== undefined)
        updates.starknetAddress =
          (parsed as { starknetAddress?: string }).starknetAddress?.trim() || null;
      const result = await updateProject(parsed.projectId, updates, walletAddress);
      return NextResponse.json(result);
    }
    const parsed = projectRotateSchema.parse(body);
    const apiKey = await rotateApiKey(parsed.projectId, walletAddress);
    return NextResponse.json(apiKey);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const walletAddress = requireWalletAddressFromHeaders(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 },
      );
    }
    const result = await deleteProject(projectId, walletAddress);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}

