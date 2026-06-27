import { LayoutDashboard, MapPin, ScanLine, Users, UserPlus, BarChart3, AlertTriangle, Settings, CreditCard, Footprints } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Logo } from "@/components/Logo";
import { useLocation } from "react-router-dom";
import { useAuth, type Role } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

// Each nav item declares which roles can see it. super_admin = everything.
// regional_admin = own-region admin features (no Global Dashboard).
// Volunteers never reach this sidebar — they're bounced to /walk by the
// route guard before AppLayout renders.
type NavItem = {
  title: string;
  url: string;
  icon: typeof ScanLine;
  roles: Role[];
};

const navItems: NavItem[] = [
  { title: "Check-In", url: "/", icon: ScanLine, roles: ["super_admin", "regional_admin"] },
  { title: "Global Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["super_admin"] },
  { title: "Bristol", url: "/bristol", icon: MapPin, roles: ["super_admin", "regional_admin"] },
  { title: "Member Directory", url: "/members", icon: Users, roles: ["super_admin", "regional_admin"] },
  { title: "Add Member", url: "/members/new", icon: UserPlus, roles: ["super_admin", "regional_admin"] },
  { title: "Reports", url: "/reports", icon: BarChart3, roles: ["super_admin", "regional_admin"] },
  { title: "Engagement Alerts", url: "/alerts", icon: AlertTriangle, roles: ["super_admin", "regional_admin"] },
  { title: "Cards", url: "/cards", icon: CreditCard, roles: ["super_admin", "regional_admin"] },
  { title: "Settings", url: "/settings", icon: Settings, roles: ["super_admin", "regional_admin"] },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile } = useAuth();
  const role = profile?.role;
  const visibleItems = role
    ? navItems.filter((item) => item.roles.includes(role))
    : [];

  function handleNav() {
    if (isMobile) setOpenMobile(false);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          {!collapsed ? (
            <div className="bg-white rounded-2xl p-4 shadow-xl ring-1 ring-black/5 mb-1">
              <Logo className="h-24 w-full object-contain" />
            </div>
          ) : (
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ backgroundImage: "linear-gradient(135deg, hsl(43 80% 58%), hsl(38 90% 48%))" }}
            >
              <Footprints className="h-5 w-5 text-[hsl(228_72%_24%)]" />
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      onClick={handleNav}
                      className="rounded-xl px-3 py-2.5 my-0.5 text-sidebar-foreground/90 hover:bg-white/10 transition-colors"
                      activeClassName="bg-white/15 text-white font-semibold ring-1 ring-white/15 shadow-sm"
                    >
                      <item.icon className="mr-3 h-[18px] w-[18px]" />
                      {!collapsed && <span className="text-[15px]">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
