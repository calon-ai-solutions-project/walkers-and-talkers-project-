import { LayoutDashboard, MapPin, ScanLine, Users, UserPlus, BarChart3, AlertTriangle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
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
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4">
          {!collapsed && (
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-sidebar-accent flex items-center justify-center">
                <span className="text-sidebar-accent-foreground font-bold text-sm">MC</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-sidebar-foreground">MemberCheck</h2>
                <p className="text-xs text-sidebar-muted">Attendance System</p>
              </div>
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
                      className="hover:bg-sidebar-accent/50 text-sidebar-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
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
