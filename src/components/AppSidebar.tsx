import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
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
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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

  const mainNavItems = [
    { to: "/", label: t("nav.orders"), icon: ShoppingCart },
    { to: "/tekshiruv", label: t("nav.examination"), icon: Eye },
  ];

  const productNavItems = [
    { to: "/tayyor-kozoynaklar", label: t("nav.readyGlasses"), icon: Glasses },
    { to: "/linza-sotuvi", label: t("nav.lensSales"), icon: ClipboardList },
    { to: "/linza-royxati", label: t("nav.lensLists"), icon: Contact },
  ];

  const financeNavItems = [
    { to: "/xarajatlar", label: t("nav.expenses"), icon: Wallet },
    { to: "/qarzdorlar", label: t("nav.debtors"), icon: UserX },
    { to: "/hisobotlar", label: t("nav.reports"), icon: BarChart3 },
  ];

  const otherNavItems = [
    { to: "/chiqindilar", label: t("nav.trash"), icon: Trash2 },
    ...(isAdmin ? [{ to: "/admin/users", label: t("nav.users"), icon: Users }] : []),
  ];

  const renderNavItem = (item: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.to;

    const linkContent = (
      <Link
        to={item.to}
        className={cn(
          "relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group/item",
          isActive
            ? "text-white"
            : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        )}
      >
        {isActive && (
          <motion.div
            layoutId="activeSidebarTab"
            className="absolute inset-0 gradient-primary rounded-xl shadow-premium"
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
          />
        )}
        <span className="relative z-10 flex items-center gap-3">
          <Icon className={cn(
            "w-5 h-5 shrink-0 transition-transform duration-200 group-hover/item:scale-110",
            isActive && "drop-shadow-sm"
          )} />
          {!isCollapsed && (
            <span className="truncate">{item.label}</span>
          )}
        </span>
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.to}>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  const NavGroup = ({ 
    label, 
    items 
  }: { 
    label: string; 
    items: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[] 
  }) => (
    <SidebarGroup>
      {!isCollapsed && (
        <SidebarGroupLabel className="text-xs uppercase tracking-wider text-sidebar-foreground/50 px-3 mb-1">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu className="space-y-1">
          {items.map((item) => (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton asChild className="p-0 h-auto hover:bg-transparent">
                {renderNavItem(item)}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-sidebar-border bg-sidebar/95 backdrop-blur-md"
    >
      <SidebarHeader className="p-4 border-b border-sidebar-border/50">
        <Link to="/" className="flex items-center gap-3 group cursor-pointer">
          <div className="p-2 rounded-xl gradient-primary shadow-premium group-hover:scale-105 transition-transform duration-300">
            <Glasses className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-lg font-bold text-sidebar-foreground group-hover:text-primary transition-colors"
            >
              {t("app.title")}
            </motion.span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-3 space-y-4 overflow-y-auto scrollbar-hide">
        <NavGroup label={t("nav.main") || "Asosiy"} items={mainNavItems} />
        <NavGroup label={t("nav.products") || "Mahsulotlar"} items={productNavItems} />
        <NavGroup label={t("nav.finance") || "Moliya"} items={financeNavItems} />
        {otherNavItems.length > 0 && (
          <NavGroup label={t("nav.other") || "Boshqa"} items={otherNavItems} />
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={cn(
            "w-full justify-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200",
            isCollapsed && "px-0"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-xs">{t("sidebar.collapse") || "Yig'ish"}</span>
            </>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
