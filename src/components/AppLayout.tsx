import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user, signOut } = useAuth();
  const displayName = profile?.full_name || profile?.email || user?.email || "";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="text-sm font-semibold text-foreground">
                Walkers &amp; Talkers
              </span>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <div className="text-right leading-tight">
                    <span className="block text-sm text-foreground">
                      {displayName}
                    </span>
                    {profile?.role && (
                      <span className="block text-xs text-muted-foreground">
                        {profile.role.replace("_", " ")}
                      </span>
                    )}
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {displayName ? initials(displayName) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void signOut()}
                  >
                    Sign out
                  </Button>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Bristol</span>
              )}
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
