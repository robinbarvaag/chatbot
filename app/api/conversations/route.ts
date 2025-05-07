import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  // Hent innlogget bruker (forutsetter NextAuth)
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { user: { email: session.user.email } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      messages: { select: { id: true } },
    },
  });
  return NextResponse.json(conversations);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  let id: string | undefined;
  try {
    const body = await req.json();
    id = body.id;
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: "Mangler samtale-id" }, { status: 400 });
  }

  // Sjekk at samtalen tilhører brukeren
  const convo = await prisma.conversation.findUnique({
    where: { id },
    select: { user: { select: { email: true } } },
  });
  if (!convo || convo.user?.email !== session.user.email) {
    return NextResponse.json({ error: "Ingen tilgang til denne samtalen" }, { status: 403 });
  }

  const conversation = await prisma.conversation.delete({
    where: { id },
    select: { id: true },
  });
  return NextResponse.json(conversation);
}