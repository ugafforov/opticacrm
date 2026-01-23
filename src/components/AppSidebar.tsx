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
  Menu,
  LogOut
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AppSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const AppSidebar = ({ isOpen, onToggle }: AppSidebarProps) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { isAdmin, signOut } = useAuth();

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

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.to;

    const linkContent = (
      <Link
        to={item.to}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative",
          isActive
            ? "text-primary bg-primary/10"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        {/* Active indicator line */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
        )}
        <Icon className="h-5 w-5 shrink-0" />
        {isOpen && (
          <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
        )}
      </Link>
    );

    if (!isOpen) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border flex flex-col transition-[width] duration-200 ease-out",
          isOpen ? "w-60" : "w-16"
        )}
      >
        {/* Header with hamburger menu */}
        <div className="flex items-center gap-3 p-3 border-b border-border shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-10 w-10 shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {isOpen && (
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shrink-0">
                <Glasses className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground whitespace-nowrap">
                {t("app.title")}
              </span>
            </Link>
          )}
        </div>

        {/* Navigation with scroll */}
        <ScrollArea className="flex-1 py-2">
          <nav className="flex flex-col gap-1 px-2">
            {navItems.map((item) => (
              <NavItem key={item.to} item={item} />
            ))}
          </nav>
        </ScrollArea>

        {/* Footer with logout */}
        <div className="p-2 border-t border-border shrink-0">
          {!isOpen ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={signOut}
                  className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                {t("auth.signOut")}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              onClick={signOut}
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm font-medium">{t("auth.signOut")}</span>
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default AppSidebar;
