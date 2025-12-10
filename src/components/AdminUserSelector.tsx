import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface AdminUserSelectorProps {
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
}

export function AdminUserSelector({ selectedUserIds, onSelectionChange }: AdminUserSelectorProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Check if user has admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleData) {
        setIsAdmin(true);
        await loadAllUsers();
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      if (error) throw error;

      setUsers(profilesData || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleUserToggle = (userId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedUserIds, userId]);
    } else {
      onSelectionChange(selectedUserIds.filter(id => id !== userId));
    }
  };

  const selectAll = () => {
    onSelectionChange(users.map(u => u.id));
  };

  const clearSelection = () => {
    // Always keep current user selected
    if (currentUserId) {
      onSelectionChange([currentUserId]);
    } else {
      onSelectionChange([]);
    }
  };

  if (loading) {
    return null;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Visualização Admin</CardTitle>
        </div>
        <CardDescription>
          Selecione quais usuários deseja visualizar os dados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="text-xs text-primary hover:underline"
          >
            Selecionar Todos
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            onClick={clearSelection}
            className="text-xs text-primary hover:underline"
          >
            Limpar Seleção
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map((user) => (
            <div key={user.id} className="flex items-center space-x-2 p-2 rounded-md border">
              <Checkbox
                id={`user-${user.id}`}
                checked={selectedUserIds.includes(user.id)}
                onCheckedChange={(checked) => handleUserToggle(user.id, checked as boolean)}
              />
              <Label
                htmlFor={`user-${user.id}`}
                className="text-sm cursor-pointer flex-1"
              >
                <div className="font-medium">{user.full_name || 'Sem nome'}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </Label>
              {user.id === currentUserId && (
                <Badge variant="secondary" className="text-xs">Você</Badge>
              )}
            </div>
          ))}
        </div>

        {selectedUserIds.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {selectedUserIds.length} usuário(s) selecionado(s)
          </div>
        )}
      </CardContent>
    </Card>
  );
}
