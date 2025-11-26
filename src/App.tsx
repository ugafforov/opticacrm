import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PageTransition } from "./components/PageTransition";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Buyurtmalar from "./pages/Buyurtmalar";
import LinzaRoyxati from "./pages/LinzaRoyxati";
import Tekshiruv from "./pages/Tekshiruv";
import TayyorKozoynaklar from "./pages/TayyorKozoynaklar";
import LinzaSotuvi from "./pages/LinzaSotuvi";
import Hisobotlar from "./pages/Hisobotlar";
import Chiqindilar from "./pages/Chiqindilar";
import AdminUsers from "./pages/AdminUsers";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
            <Route path="/" element={<ProtectedRoute><Layout><PageTransition><Buyurtmalar /></PageTransition></Layout></ProtectedRoute>} />
            <Route path="/linza-royxati" element={<ProtectedRoute><Layout><PageTransition><LinzaRoyxati /></PageTransition></Layout></ProtectedRoute>} />
            <Route path="/tekshiruv" element={<ProtectedRoute><Layout><PageTransition><Tekshiruv /></PageTransition></Layout></ProtectedRoute>} />
            <Route path="/tayyor-kozoynaklar" element={<ProtectedRoute><Layout><PageTransition><TayyorKozoynaklar /></PageTransition></Layout></ProtectedRoute>} />
            <Route path="/linza-sotuvi" element={<ProtectedRoute><Layout><PageTransition><LinzaSotuvi /></PageTransition></Layout></ProtectedRoute>} />
            <Route path="/hisobotlar" element={<ProtectedRoute><Layout><PageTransition><Hisobotlar /></PageTransition></Layout></ProtectedRoute>} />
            <Route path="/chiqindilar" element={<ProtectedRoute><Layout><PageTransition><Chiqindilar /></PageTransition></Layout></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><Layout><PageTransition><AdminUsers /></PageTransition></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Layout><PageTransition><Profile /></PageTransition></Layout></ProtectedRoute>} />
            <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
