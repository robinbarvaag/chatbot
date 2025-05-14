import { getServerSession as getNextServerSession } from "next-auth/next";
import { authOptions } from "@/app/(auth)/api/auth/[...nextauth]/route";

export async function getServerSession() {
  return getNextServerSession(authOptions);
}
