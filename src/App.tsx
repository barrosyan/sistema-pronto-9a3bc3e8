import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Leads from "./pages/Leads";
import Analytics from "./pages/Analytics";
import Merge from "./pages/Merge";
import ContentGeneration from "./pages/ContentGeneration";
import Profile from "./pages/Profile";
import UserSettings from "./pages/UserSettings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Layout><Leads /></Layout></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>} />
            <Route path="/merge" element={<ProtectedRoute><Layout><Merge /></Layout></ProtectedRoute>} />
            <Route path="/content-generation" element={<ProtectedRoute><Layout><ContentGeneration /></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><UserSettings /></Layout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
