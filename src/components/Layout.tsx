import { Glasses, WifiOff } from "lucide-react";
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
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <header className="glass sticky top-0 z-40 border-b border-border/50 shadow-sm animate-fade-in-down">
            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="lg:hidden h-9 w-9 shrink-0" />
                <h1 className="text-xl font-bold text-primary flex items-center gap-2 group cursor-default lg:hidden">
                  <Glasses className="w-6 h-6 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110" />
                  <span className="transition-all duration-500 group-hover:tracking-wide">{t("app.title")}</span>
                </h1>
              </div>
              
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
          </header>
          
          <main className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
            <div className="backdrop-blur-sm">
              {children}
            </div>
          </main>
          
          <Footer />
        </div>
        
        <ConnectionIndicator />
      </div>
    </SidebarProvider>
  );
};

export default Layout;
