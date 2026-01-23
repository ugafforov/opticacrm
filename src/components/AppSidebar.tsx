import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronRight,
  PanelLeftClose,
  PanelLeft
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
import { Separator } from "@/components/ui/separator";

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

  const NavItem = ({ item }: { item: { to: string; label: string; icon: React.ComponentType<{ className?: string }> } }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.to;

    const linkContent = (
      <Link
        to={item.to}
        className={cn(
          "relative flex items-center w-full rounded-xl text-sm font-medium transition-all duration-300 group/item overflow-hidden",
          isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5",
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
        <Icon className={cn(
          "relative z-10 shrink-0 transition-transform duration-200 group-hover/item:scale-110",
          isCollapsed ? "w-6 h-6" : "w-5 h-5",
          isActive && "drop-shadow-sm"
        )} />
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 truncate whitespace-nowrap"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent 
            side="right" 
            sideOffset={12}
            className="font-medium bg-popover border border-border shadow-lg"
          >
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  const NavGroup = ({ 
    label, 
    items,
    showSeparator = true
  }: { 
    label: string; 
    items: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
    showSeparator?: boolean;
  }) => (
    <SidebarGroup className="px-2">
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 px-3 mb-1.5 font-semibold">
              {label}
            </SidebarGroupLabel>
          </motion.div>
        )}
      </AnimatePresence>
      {isCollapsed && showSeparator && (
        <Separator className="my-2 bg-sidebar-border/50" />
      )}
      <SidebarGroupContent>
        <SidebarMenu className="space-y-1">
          {items.map((item) => (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton asChild className="p-0 h-auto hover:bg-transparent">
                <NavItem item={item} />
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
      className="border-r border-sidebar-border/50 bg-sidebar/98 backdrop-blur-xl shadow-lg"
    >
      <SidebarHeader className={cn(
        "border-b border-sidebar-border/30 transition-all duration-300",
        isCollapsed ? "p-3" : "p-4"
      )}>
        <Link to="/" className={cn(
          "flex items-center group cursor-pointer transition-all duration-300",
          isCollapsed ? "justify-center" : "gap-3"
        )}>
          <div className={cn(
            "rounded-xl gradient-primary shadow-premium group-hover:scale-105 transition-transform duration-300 flex items-center justify-center",
            isCollapsed ? "p-2.5" : "p-2"
          )}>
            <Glasses className={cn(
              "text-white transition-all duration-300",
              isCollapsed ? "w-6 h-6" : "w-5 h-5"
            )} />
          </div>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="text-lg font-bold text-sidebar-foreground group-hover:text-primary transition-colors whitespace-nowrap"
              >
                {t("app.title")}
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </SidebarHeader>

      <SidebarContent className={cn(
        "overflow-y-auto scrollbar-hide transition-all duration-300",
        isCollapsed ? "py-3 px-1" : "p-3 space-y-2"
      )}>
        <NavGroup label={t("nav.main") || "Asosiy"} items={mainNavItems} showSeparator={false} />
        <NavGroup label={t("nav.products") || "Mahsulotlar"} items={productNavItems} />
        <NavGroup label={t("nav.finance") || "Moliya"} items={financeNavItems} />
        {otherNavItems.length > 0 && (
          <NavGroup label={t("nav.other") || "Boshqa"} items={otherNavItems} />
        )}
      </SidebarContent>

      <SidebarFooter className={cn(
        "border-t border-sidebar-border/30 transition-all duration-300",
        isCollapsed ? "p-2" : "p-3"
      )}>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className={cn(
                "w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-300 rounded-xl",
                isCollapsed ? "justify-center p-3" : "justify-start gap-3 px-3"
              )}
            >
              {isCollapsed ? (
                <PanelLeft className="w-5 h-5" />
              ) : (
                <>
                  <PanelLeftClose className="w-5 h-5" />
                  <span className="text-sm">{t("sidebar.collapse") || "Yig'ish"}</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent 
              side="right" 
              sideOffset={12}
              className="font-medium bg-popover border border-border shadow-lg"
            >
              {t("sidebar.expand") || "Yoyish"}
            </TooltipContent>
          )}
        </Tooltip>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
