import { NextRequest, NextResponse } from "next/server";
import {
  createProject,
  listProjects,
  rotateApiKey,
} from "@/lib/x402/project-service";
import { projectCreateSchema, projectRotateSchema } from "@/types/schemas";
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
    const body = projectRotateSchema.parse(await request.json());
    const apiKey = await rotateApiKey(body.projectId, walletAddress);
    return NextResponse.json(apiKey);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}

