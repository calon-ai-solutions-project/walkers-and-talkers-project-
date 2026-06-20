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
          <header className="h-16 flex items-center justify-between border-b glass px-3 sm:px-6 sticky top-0 z-20">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger />
              <span className="text-sm sm:text-base font-extrabold tracking-tight gradient-text truncate">
                Walkers &amp; Talkers
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {user ? (
                <>
                  <div className="text-right leading-tight hidden sm:block">
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
          <main className="flex-1 overflow-auto">
            <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
