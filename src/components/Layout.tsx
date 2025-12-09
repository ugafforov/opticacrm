import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Glasses, ShoppingCart, ClipboardList, Contact, Eye, BarChart3, Trash2, Users, WifiOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import LanguageSwitcher from "./LanguageSwitcher";
import UserProfile from "./UserProfile";
import Footer from "./Footer";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { user, isAdmin, signOut } = useAuth();
  const { isOnline } = useNetworkStatus();

  const navItems = [
    { to: "/", label: t("nav.orders"), icon: ShoppingCart },
    { to: "/tekshiruv", label: t("nav.examination"), icon: Eye },
    { to: "/tayyor-kozoynaklar", label: t("nav.readyGlasses"), icon: Glasses },
    { to: "/linza-sotuvi", label: t("nav.lensSales"), icon: ClipboardList },
    { to: "/linza-royxati", label: t("nav.lensLists"), icon: Contact },
    { to: "/hisobotlar", label: t("nav.reports"), icon: BarChart3 },
    { to: "/chiqindilar", label: t("nav.trash"), icon: Trash2 },
  ];

  if (isAdmin) {
    navItems.push({ to: "/admin/users", label: t("nav.users"), icon: Users });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass sticky top-0 z-50 border-b border-border/50 shadow-premium animate-fade-in-down">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2 animate-fade-in group cursor-default">
              <Glasses className="w-7 h-7 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110" />
              <span className="transition-all duration-500 group-hover:tracking-wide">{t("app.title")}</span>
            </h1>
            <div className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              {!isOnline && (
                <div className="flex items-center gap-1 text-destructive text-sm animate-pulse">
                  <WifiOff className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("network.lost")}</span>
                </div>
              )}
              <LanguageSwitcher />
              <UserProfile user={user} onSignOut={signOut} />
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 hover-scale-sm animate-slide-in-right relative overflow-hidden group",
                    isActive
                      ? "gradient-primary text-white shadow-premium glow-primary"
                      : "bg-card/50 text-foreground hover:bg-card hover:shadow-md backdrop-blur-sm border border-border/50"
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive && "drop-shadow-sm")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="backdrop-blur-sm">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
