import { useState } from "react";
import { WifiOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { ConnectionIndicator } from "./ConnectionIndicator";
import LanguageSwitcher from "./LanguageSwitcher";
import UserProfile from "./UserProfile";
import Footer from "./Footer";
import AppSidebar from "./AppSidebar";
import { cn } from "@/lib/utils";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      
      <div 
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-[margin-left] duration-200 ease-out",
          sidebarOpen ? "ml-60" : "ml-16"
        )}
      >
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="px-4 py-2.5 flex items-center justify-end gap-4">
            {!isOnline && (
              <div className="flex items-center gap-1 text-destructive text-sm">
                <WifiOff className="w-4 h-4" />
                <span className="hidden sm:inline">{t("network.lost")}</span>
              </div>
            )}
            <LanguageSwitcher />
            <UserProfile user={user} onSignOut={signOut} />
          </div>
        </header>
        
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
        
        <Footer />
      </div>
      
      <ConnectionIndicator />
    </div>
  );
};

export default Layout;
