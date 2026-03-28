
import { NextResponse } from 'next/server';

// This webhook functionality has been temporarily disabled.
export async function POST(req: Request) {
    return NextResponse.json({ message: "Webhook disabled." }, { status: 200 });
}
