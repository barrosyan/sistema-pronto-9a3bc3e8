import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavLink } from './NavLink';
import { Merge, Users, Sparkles, LogOut, User, Settings, Target, Calendar, Check, ChevronsUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { useProfileFilter } from '@/contexts/ProfileFilterContext';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const { selectedProfiles, toggleProfile, selectAllProfiles, clearProfiles, availableProfiles } = useProfileFilter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao fazer logout");
    } else {
      toast.success("Logout realizado com sucesso!");
      navigate("/auth");
    }
  };

  const getProfileLabel = () => {
    if (selectedProfiles.length === 0) return "Nenhum perfil";
    if (selectedProfiles.length === 1) return selectedProfiles[0];
    if (selectedProfiles.length === availableProfiles.length) return "Todos os perfis";
    return `${selectedProfiles.length} perfis`;
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
                  <span className="text-sm text-muted-foreground">Perfis:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-[200px] justify-between bg-background"
                      >
                        <span className="truncate">{getProfileLabel()}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0 bg-background border-border shadow-lg z-[100]">
                      <div className="p-2 space-y-2">
                        <div className="flex gap-2 pb-2 border-b">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="flex-1 h-7 text-xs"
                            onClick={selectAllProfiles}
                          >
                            Todos
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="flex-1 h-7 text-xs"
                            onClick={clearProfiles}
                          >
                            Limpar
                          </Button>
                        </div>
                        <div className="space-y-1 max-h-[200px] overflow-y-auto">
                          {availableProfiles.map((profile) => (
                            <div
                              key={profile}
                              className="flex items-center space-x-2 p-2 rounded hover:bg-accent cursor-pointer"
                              onClick={() => toggleProfile(profile)}
                            >
                              <Checkbox
                                id={`profile-${profile}`}
                                checked={selectedProfiles.includes(profile)}
                                onCheckedChange={() => toggleProfile(profile)}
                              />
                              <Label
                                htmlFor={`profile-${profile}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {profile}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
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
