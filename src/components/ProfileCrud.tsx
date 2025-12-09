import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  profile_name: string;
  created_at: string;
}

interface ProfileCrudProps {
  onProfilesChange?: () => void;
}

export function ProfileCrud({ onProfilesChange }: ProfileCrudProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles_data')
        .select('*')
        .eq('user_id', user.id)
        .order('profile_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast.error('Erro ao carregar perfis');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingProfile(null);
    setProfileName('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setProfileName(profile.profile_name);
    setDialogOpen(true);
  };

  const handleOpenDelete = (profile: Profile) => {
    setProfileToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!profileName.trim()) {
      toast.error('Nome do perfil é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      if (editingProfile) {
        // Update
        const { error } = await supabase
          .from('profiles_data')
          .update({ profile_name: profileName.trim() })
          .eq('id', editingProfile.id);

        if (error) throw error;
        toast.success('Perfil atualizado com sucesso');
      } else {
        // Create
        const { error } = await supabase
          .from('profiles_data')
          .insert({
            user_id: user.id,
            profile_name: profileName.trim(),
          });

        if (error) throw error;
        toast.success('Perfil criado com sucesso');
      }

      setDialogOpen(false);
      loadProfiles();
      onProfilesChange?.();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!profileToDelete) return;

    try {
      const { error } = await supabase
        .from('profiles_data')
        .delete()
        .eq('id', profileToDelete.id);

      if (error) throw error;
      toast.success('Perfil excluído com sucesso');
      setDeleteDialogOpen(false);
      setProfileToDelete(null);
      loadProfiles();
      onProfilesChange?.();
    } catch (error: any) {
      console.error('Error deleting profile:', error);
      toast.error(error.message || 'Erro ao excluir perfil');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Gerenciar Perfis
              </CardTitle>
              <CardDescription>
                Crie, edite ou remova perfis que não estão no CSV
              </CardDescription>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Perfil
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando perfis...
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p>Nenhum perfil cadastrado</p>
              <p className="text-sm mt-1">Crie um novo perfil para começar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Perfil</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.profile_name}</TableCell>
                    <TableCell>
                      {new Date(profile.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(profile)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDelete(profile)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? 'Editar Perfil' : 'Novo Perfil'}
            </DialogTitle>
            <DialogDescription>
              {editingProfile
                ? 'Atualize o nome do perfil'
                : 'Digite o nome do novo perfil'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profileName">Nome do Perfil</Label>
              <Input
                id="profileName"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Ex: João Silva"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingProfile ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o perfil "{profileToDelete?.profile_name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
