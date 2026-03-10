import { NextResponse } from "next/server";

export async function GET() {
	return NextResponse.json(
		{ error: "Circle Gateway is disabled in this project." },
		{ status: 410 },
	);
}

export async function POST() {
	return NextResponse.json(
		{ error: "Circle Gateway is disabled in this project." },
		{ status: 410 },
	);
}

