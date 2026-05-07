import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { PageTransition } from "./components/PageTransition";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { NetworkProvider } from "@/contexts/NetworkContext";

// Lazy load pages for code splitting - reduces initial bundle size
const Buyurtmalar = lazy(() => import("./pages/Buyurtmalar"));
const LinzaRoyxati = lazy(() => import("./pages/LinzaRoyxati"));
const Tekshiruv = lazy(() => import("./pages/Tekshiruv"));
const TayyorKozoynaklar = lazy(() => import("./pages/TayyorKozoynaklar"));
const LinzaSotuvi = lazy(() => import("./pages/LinzaSotuvi"));
const Hisobotlar = lazy(() => import("./pages/Hisobotlar"));
const Xarajatlar = lazy(() => import("./pages/Xarajatlar"));
const Qarzdorlar = lazy(() => import("./pages/Qarzdorlar"));
const Chiqindilar = lazy(() => import("./pages/Chiqindilar"));

const AdminImport = lazy(() => import("./pages/AdminImport"));
const AdminTelegram = lazy(() => import("./pages/AdminTelegram"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));

// Preload all pages in background after initial render
const preloadPages = () => {
  import("./pages/Buyurtmalar");
  import("./pages/LinzaRoyxati");
  import("./pages/Tekshiruv");
  import("./pages/TayyorKozoynaklar");
  import("./pages/LinzaSotuvi");
  import("./pages/Hisobotlar");
  import("./pages/Xarajatlar");
  import("./pages/Qarzdorlar");
  import("./pages/Chiqindilar");
  import("./pages/AdminImport");
  import("./pages/Profile");
  import("./pages/NotFound");
  import("./pages/Auth");
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - cache retained
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 2,
      retryDelay: 1000,
    },
  },
});

// Wrapper to handle individual page suspense
const SuspensePage = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={null}>
    <PageTransition>{children}</PageTransition>
  </Suspense>
);

const AppRoutes = () => {
  // Preload all pages after first render
  useEffect(() => {
    const timer = setTimeout(preloadPages, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Routes>
      <Route path="/auth" element={<Suspense fallback={null}><PageTransition><Auth /></PageTransition></Suspense>} />
      <Route path="/" element={<ProtectedRoute><Layout><SuspensePage><Buyurtmalar /></SuspensePage></Layout></ProtectedRoute>} />
      <Route path="/linza-royxati" element={<ProtectedRoute><Layout><SuspensePage><LinzaRoyxati /></SuspensePage></Layout></ProtectedRoute>} />
      <Route path="/tekshiruv" element={<ProtectedRoute><Layout><SuspensePage><Tekshiruv /></SuspensePage></Layout></ProtectedRoute>} />
      <Route path="/tayyor-kozoynaklar" element={<ProtectedRoute><Layout><SuspensePage><TayyorKozoynaklar /></SuspensePage></Layout></ProtectedRoute>} />
      <Route path="/linza-sotuvi" element={<ProtectedRoute><Layout><SuspensePage><LinzaSotuvi /></SuspensePage></Layout></ProtectedRoute>} />
      <Route path="/hisobotlar" element={<ProtectedRoute><Layout><SuspensePage><Hisobotlar /></SuspensePage></Layout></ProtectedRoute>} />
      <Route path="/xarajatlar" element={<ProtectedRoute><Layout><SuspensePage><Xarajatlar /></SuspensePage></Layout></ProtectedRoute>} />
      <Route path="/qarzdorlar" element={<ProtectedRoute><Layout><SuspensePage><Qarzdorlar /></SuspensePage></Layout></ProtectedRoute>} />
      <Route path="/chiqindilar" element={<ProtectedRoute><Layout><SuspensePage><Chiqindilar /></SuspensePage></Layout></ProtectedRoute>} />
      <Route path="/admin/users" element={<AdminRoute><Layout><SuspensePage><AdminUsers /></SuspensePage></Layout></AdminRoute>} />
      <Route path="/admin/import" element={<AdminRoute><Layout><SuspensePage><AdminImport /></SuspensePage></Layout></AdminRoute>} />
      <Route path="/admin/telegram" element={<AdminRoute><Layout><SuspensePage><AdminTelegram /></SuspensePage></Layout></AdminRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Layout><SuspensePage><Profile /></SuspensePage></Layout></ProtectedRoute>} />
      <Route path="*" element={<Suspense fallback={null}><PageTransition><NotFound /></PageTransition></Suspense>} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <NetworkProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </NetworkProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
