import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavLink } from './NavLink';
import { Merge, Users, Sparkles, LogOut, User, Settings, Target, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { useProfileFilter } from '@/contexts/ProfileFilterContext';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const { selectedProfile, setSelectedProfile, availableProfiles } = useProfileFilter();

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
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Sistema Pronto</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Gestão Inteligente de Campanhas e Leads
                </p>
              </div>
              
              {availableProfiles.length > 0 && (
                <div className="flex items-center gap-2 ml-6">
                  <span className="text-sm text-muted-foreground">Perfil:</span>
                  <Select 
                    value={selectedProfile || undefined} 
                    onValueChange={setSelectedProfile}
                  >
                    <SelectTrigger className="w-[200px] bg-background">
                      <SelectValue placeholder="Selecione um perfil" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border shadow-lg z-[100]">
                      {availableProfiles.map((profile) => (
                        <SelectItem key={profile} value={profile} className="hover:bg-accent">
                          {profile}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Configurações
              </Button>
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
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            <NavLink to="/profile" icon={<User className="h-4 w-4" />} subtitle="Compilado">
              Perfil
            </NavLink>
            <NavLink to="/campaigns" icon={<Target className="h-4 w-4" />} subtitle="Visão Geral">
              Campanhas
            </NavLink>
            <NavLink to="/events" icon={<Calendar className="h-4 w-4" />}>
              Eventos
            </NavLink>
            <NavLink to="/" icon={<Users className="h-4 w-4" />}>
              Leads
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
