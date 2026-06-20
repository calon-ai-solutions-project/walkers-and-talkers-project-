import { LayoutDashboard, MapPin, ScanLine, Users, UserPlus, BarChart3, AlertTriangle, Settings, CreditCard, Footprints } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Logo } from "@/components/Logo";
import { useLocation } from "react-router-dom";
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

const navItems = [
  { title: "Check-In", url: "/", icon: ScanLine },
  { title: "Global Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Bristol", url: "/bristol", icon: MapPin },
  { title: "Member Directory", url: "/members", icon: Users },
  { title: "Add Member", url: "/members/new", icon: UserPlus },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Engagement Alerts", url: "/alerts", icon: AlertTriangle },
  { title: "Cards", url: "/cards", icon: CreditCard },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          {!collapsed ? (
            <div className="bg-white rounded-xl p-2.5 shadow-md mb-1">
              <Logo className="h-14 w-full object-contain" />
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
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
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
