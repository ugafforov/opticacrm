import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Glasses, 
  ShoppingCart, 
  ClipboardList, 
  Contact, 
  Eye, 
  BarChart3, 
  Trash2, 
  Users, 
  Wallet, 
  UserX,
  PanelLeftClose,
  PanelLeft
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const AppSidebar = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  const navItems = [
    { to: "/", label: t("nav.orders"), icon: ShoppingCart },
    { to: "/tekshiruv", label: t("nav.examination"), icon: Eye },
    { to: "/tayyor-kozoynaklar", label: t("nav.readyGlasses"), icon: Glasses },
    { to: "/linza-sotuvi", label: t("nav.lensSales"), icon: ClipboardList },
    { to: "/linza-royxati", label: t("nav.lensLists"), icon: Contact },
    { to: "/xarajatlar", label: t("nav.expenses"), icon: Wallet },
    { to: "/qarzdorlar", label: t("nav.debtors"), icon: UserX },
    { to: "/hisobotlar", label: t("nav.reports"), icon: BarChart3 },
    { to: "/chiqindilar", label: t("nav.trash"), icon: Trash2 },
    ...(isAdmin ? [{ to: "/admin/users", label: t("nav.users"), icon: Users }] : []),
  ];

  const NavLink = ({ item }: { item: typeof navItems[0] }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.to;

    const link = (
      <Link
        to={item.to}
        className={cn(
          "flex items-center gap-3 rounded-lg transition-colors",
          isCollapsed ? "justify-center p-2.5" : "px-3 py-2",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!isCollapsed && (
          <span className="text-sm font-medium truncate">{item.label}</span>
        )}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return link;
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarHeader className={cn("border-b border-border", isCollapsed ? "p-2" : "p-3")}>
        <Link 
          to="/" 
          className={cn(
            "flex items-center gap-2",
            isCollapsed ? "justify-center" : ""
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Glasses className="h-4 w-4 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <span className="font-semibold text-foreground">{t("app.title")}</span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className={cn("flex-1 overflow-y-auto", isCollapsed ? "p-1.5" : "p-2")}>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink key={item.to} item={item} />
          ))}
        </nav>
      </SidebarContent>

      <SidebarFooter className={cn("border-t border-border", isCollapsed ? "p-2" : "p-3")}>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className={cn(
                "w-full text-muted-foreground hover:text-foreground",
                isCollapsed ? "justify-center p-2" : "justify-start gap-2"
              )}
            >
              {isCollapsed ? (
                <PanelLeft className="h-5 w-5" />
              ) : (
                <>
                  <PanelLeftClose className="h-5 w-5" />
                  <span className="text-sm">{t("sidebar.collapse")}</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" sideOffset={8}>
              {t("sidebar.expand")}
            </TooltipContent>
          )}
        </Tooltip>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
