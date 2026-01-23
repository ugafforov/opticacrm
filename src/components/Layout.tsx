import { useState, useEffect } from "react";
import { WifiOff, Menu, Glasses } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { ConnectionIndicator } from "./ConnectionIndicator";
import LanguageSwitcher from "./LanguageSwitcher";
import UserProfile from "./UserProfile";
import Footer from "./Footer";
import AppSidebar from "./AppSidebar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const SIDEBAR_STORAGE_KEY = "sidebar-open";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const { isOnline } = useNetworkStatus();
  
  // Initialize from localStorage
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen));
  }, [sidebarOpen]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Fixed header with logo - outside sidebar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background border-b border-border">
        <div className="h-full flex items-center justify-between px-4">
          {/* Left side: hamburger + logo */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-10 w-10 shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shrink-0">
                <Glasses className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground whitespace-nowrap">
                {t("app.title")}
              </span>
            </Link>
          </div>

          {/* Right side: network status, language, user */}
          <div className="flex items-center gap-3">
            {!isOnline && (
              <div className="flex items-center gap-1 text-destructive text-sm">
                <WifiOff className="w-4 h-4" />
                <span className="hidden sm:inline">{t("network.lost")}</span>
              </div>
            )}
            <LanguageSwitcher />
            <UserProfile user={user} onSignOut={signOut} />
          </div>
        </div>
      </header>

      {/* Main content area below fixed header */}
      <div className="flex flex-1 pt-14">
        <AppSidebar isOpen={sidebarOpen} />
        
        <div 
          className={cn(
            "flex-1 flex flex-col min-w-0 transition-[margin-left] duration-200 ease-out",
            sidebarOpen ? "ml-52" : "ml-16"
          )}
        >
          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
          
          <Footer />
        </div>
      </div>
      
      <ConnectionIndicator />
    </div>
  );
};

export default Layout;
