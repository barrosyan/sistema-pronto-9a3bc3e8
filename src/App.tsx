import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProfileFilterProvider } from "./contexts/ProfileFilterContext";
import { AdminUserProvider } from "./contexts/AdminUserContext";
import Leads from "./pages/Leads";
import Merge from "./pages/Merge";
import ContentGeneration from "./pages/ContentGeneration";
import Profile from "./pages/Profile";
import Campaigns from "./pages/Campaigns";
import EventsManagement from "./pages/EventsManagement";
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
          <AdminUserProvider>
            <ProfileFilterProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<ProtectedRoute><Layout><Leads /></Layout></ProtectedRoute>} />
                <Route path="/campaigns" element={<ProtectedRoute><Layout><ErrorBoundary><Campaigns /></ErrorBoundary></Layout></ProtectedRoute>} />
                <Route path="/events" element={<ProtectedRoute><Layout><EventsManagement /></Layout></ProtectedRoute>} />
                <Route path="/merge" element={<ProtectedRoute><Layout><Merge /></Layout></ProtectedRoute>} />
                <Route path="/content-generation" element={<ProtectedRoute><Layout><ContentGeneration /></Layout></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Layout><ErrorBoundary><Profile /></ErrorBoundary></Layout></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Layout><UserSettings /></Layout></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ProfileFilterProvider>
          </AdminUserProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
