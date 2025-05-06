import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "Brukernavn og passord er påkrevd" }, { status: 400 });
  }

  
  const existing = await prisma.user.findUnique({ 
    where: { email: username }
   });
  if (existing) {
    return NextResponse.json({ error: "Brukernavn er allerede i bruk" }, { status: 400 });
  }
  const hashed = await hash(password, 10);
  await prisma.user.create({ data: { email: username, name: username, password: hashed } });
  return NextResponse.json({ ok: true });
}
