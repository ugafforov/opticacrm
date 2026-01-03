import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Glasses, ShoppingCart, ClipboardList, Contact, Eye, BarChart3, Trash2, Users, WifiOff, Wallet, UserX } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { ConnectionIndicator } from "./ConnectionIndicator";
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
    { to: "/xarajatlar", label: t("nav.expenses"), icon: Wallet },
    { to: "/qarzdorlar", label: t("nav.debtors"), icon: UserX },
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
                    "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors duration-200 group",
                    isActive
                      ? "text-white"
                      : "text-foreground hover:text-primary"
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 gradient-primary rounded-xl shadow-premium"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive && "drop-shadow-sm")} />
                    {item.label}
                  </span>
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
      <ConnectionIndicator />
    </div>
  );
};

export default Layout;
