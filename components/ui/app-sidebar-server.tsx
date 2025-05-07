import { AppSidebar } from "./app-sidebar";
import { getServerSession } from "@/lib/get-server-session";

export default async function AppSidebarServer() {
  const session = await getServerSession();
  return <AppSidebar user={session?.user ?? null} />;
}
