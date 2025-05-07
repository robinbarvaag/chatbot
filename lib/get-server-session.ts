import { getServerSession as getNextServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getServerSession() {
  return getNextServerSession(authOptions);
}
