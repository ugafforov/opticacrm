import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Buyurtmalar from "./pages/Buyurtmalar";
import LinzaRoyxati from "./pages/LinzaRoyxati";
import Tekshiruv from "./pages/Tekshiruv";
import TayyorKozoynaklar from "./pages/TayyorKozoynaklar";
import LinzaSotuvi from "./pages/LinzaSotuvi";
import Hisobotlar from "./pages/Hisobotlar";
import Chiqindilar from "./pages/Chiqindilar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
  <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><Buyurtmalar /></Layout>} />
          <Route path="/linza-royxati" element={<Layout><LinzaRoyxati /></Layout>} />
          <Route path="/tekshiruv" element={<Layout><Tekshiruv /></Layout>} />
          <Route path="/tayyor-kozoynaklar" element={<Layout><TayyorKozoynaklar /></Layout>} />
          <Route path="/linza-sotuvi" element={<Layout><LinzaSotuvi /></Layout>} />
          <Route path="/hisobotlar" element={<Layout><Hisobotlar /></Layout>} />
          <Route path="/chiqindilar" element={<Layout><Chiqindilar /></Layout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
