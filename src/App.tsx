import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Buyurtmalar from "./pages/Buyurtmalar";
import LinzaRoyxati from "./pages/LinzaRoyxati";
import Tekshiruv from "./pages/Tekshiruv";
import TayyorKozoynaklar from "./pages/TayyorKozoynaklar";
import LinzaSotuvi from "./pages/LinzaSotuvi";
import Hisobotlar from "./pages/Hisobotlar";
import Chiqindilar from "./pages/Chiqindilar";
import AdminUsers from "./pages/AdminUsers";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Layout><Buyurtmalar /></Layout></ProtectedRoute>} />
          <Route path="/linza-royxati" element={<ProtectedRoute><Layout><LinzaRoyxati /></Layout></ProtectedRoute>} />
          <Route path="/tekshiruv" element={<ProtectedRoute><Layout><Tekshiruv /></Layout></ProtectedRoute>} />
          <Route path="/tayyor-kozoynaklar" element={<ProtectedRoute><Layout><TayyorKozoynaklar /></Layout></ProtectedRoute>} />
          <Route path="/linza-sotuvi" element={<ProtectedRoute><Layout><LinzaSotuvi /></Layout></ProtectedRoute>} />
          <Route path="/hisobotlar" element={<ProtectedRoute><Layout><Hisobotlar /></Layout></ProtectedRoute>} />
          <Route path="/chiqindilar" element={<ProtectedRoute><Layout><Chiqindilar /></Layout></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><Layout><AdminUsers /></Layout></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
