import { cookies } from "next/headers"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/ui/app-sidebar"
import { SiteHeader } from "@/components/ui/site-header"
import { ConversationProvider } from "@/components/conversation-provider"
import { auth } from "../(auth)/auth"
import { SignOutForm } from "@/components/sign-out-form"

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"

  const session = await auth();

  return (
    <ConversationProvider>
    <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar variant="inset" user={session?.user ?? null} signOutSlot={<SignOutForm />} />
        <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                {children}
            </div>
            </div>
        </div>
        </SidebarInset>
    </SidebarProvider>
    </ConversationProvider>
  )
}