import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Eye, ShoppingCart, ClipboardList, Glasses, Contact, BarChart3, Trash2, Users, LogOut } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <Eye className="w-7 h-7" />
              {t("app.title")}
            </h1>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                {t("auth.logout")}
              </Button>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
};

export default Layout;
