import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavLink } from './NavLink';
import { Merge, BarChart3, Users, TrendingUp, Calendar, Sparkles, LogOut, GitCompare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao fazer logout");
    } else {
      toast.success("Logout realizado com sucesso!");
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Sistema Pronto</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gestão Inteligente de Campanhas e Leads
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            <NavLink to="/" icon={<TrendingUp className="h-4 w-4" />}>
              Campanhas
            </NavLink>
            <NavLink to="/events" icon={<Calendar className="h-4 w-4" />}>
              Eventos
            </NavLink>
            <NavLink to="/leads" icon={<Users className="h-4 w-4" />}>
              Leads
            </NavLink>
            <NavLink to="/analytics" icon={<BarChart3 className="h-4 w-4" />}>
              Analytics
            </NavLink>
            <NavLink to="/comparison" icon={<GitCompare className="h-4 w-4" />}>
              Comparação
            </NavLink>
            <NavLink to="/content-generation" icon={<Sparkles className="h-4 w-4" />}>
              Geração de Conteúdo
            </NavLink>
            <NavLink to="/merge" icon={<Merge className="h-4 w-4" />}>
              Merge de Dados
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};
