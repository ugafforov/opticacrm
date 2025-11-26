import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Glasses, ShoppingCart, ClipboardList, Contact, Eye, BarChart3, Trash2, Users, LogOut } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import LanguageSwitcher from "./LanguageSwitcher";
import { Button } from "./ui/button";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { isAdmin, signOut } = useAuth();

  const navItems = [
    { to: "/", label: t("nav.orders"), icon: ShoppingCart },
    { to: "/linza-royxati", label: t("nav.lensLists"), icon: Contact },
    { to: "/tekshiruv", label: t("nav.examination"), icon: Eye },
    { to: "/tayyor-kozoynaklar", label: t("nav.readyGlasses"), icon: Glasses },
    { to: "/linza-sotuvi", label: t("nav.lensSales"), icon: ClipboardList },
    { to: "/hisobotlar", label: t("nav.reports"), icon: BarChart3 },
    { to: "/chiqindilar", label: t("nav.trash"), icon: Trash2 },
  ];

  if (isAdmin) {
    navItems.push({ to: "/admin/users", label: t("nav.users"), icon: Users });
  }

  return (
    <div className="min-h-screen">
      <header className="glass sticky top-0 z-50 border-b border-border/50 shadow-premium animate-fade-in-down">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2 animate-fade-in group cursor-default">
              <Glasses className="w-7 h-7 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110" />
              <span className="transition-all duration-500 group-hover:tracking-wide">{t("app.title")}</span>
            </h1>
            <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <LanguageSwitcher />
              <Button variant="outline" size="sm" onClick={signOut} className="hover-scale-sm">
                <LogOut className="w-4 h-4 mr-2" />
                {t("auth.logout")}
              </Button>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <div key={item.to} className="flex items-center animate-slide-in-right" style={{ animationDelay: `${index * 0.05}s` }}>
                  <Link
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 relative group",
                      isActive
                        ? "gradient-primary text-white shadow-premium glow-primary"
                        : "bg-background/50 text-foreground/80 hover:text-foreground hover:bg-card/80 hover:shadow-md backdrop-blur-sm border border-transparent hover:border-border/30"
                    )}
                  >
                    <Icon className={cn(
                      "w-4 h-4 transition-all duration-300",
                      isActive ? "drop-shadow-sm" : "opacity-70 group-hover:opacity-100 group-hover:scale-110"
                    )} />
                    <span className={cn(
                      "transition-all duration-300",
                      isActive ? "font-semibold" : "font-medium opacity-90 group-hover:opacity-100"
                    )}>
                      {item.label}
                    </span>
                    {!isActive && (
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    )}
                  </Link>
                  {index < navItems.length - 1 && (
                    <div className="h-6 w-px bg-gradient-to-b from-transparent via-border/40 to-transparent mx-1" />
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="backdrop-blur-sm">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
