import { WifiOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { ConnectionIndicator } from "./ConnectionIndicator";
import LanguageSwitcher from "./LanguageSwitcher";
import UserProfile from "./UserProfile";
import Footer from "./Footer";
import AppSidebar from "./AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const { isOnline } = useNetworkStatus();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="px-4 py-2.5 flex items-center justify-between gap-4">
              <SidebarTrigger className="h-8 w-8 shrink-0" />
              
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
          
          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
          
          <Footer />
        </div>
        
        <ConnectionIndicator />
      </div>
    </SidebarProvider>
  );
};

export default Layout;
