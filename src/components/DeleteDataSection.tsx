import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeleteDataSectionProps {
  onDataCleared?: () => void;
}

export function DeleteDataSection({ onDataCleared }: DeleteDataSectionProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClearAllData = async () => {
    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Delete in order to respect foreign key constraints
      await supabase.from('daily_metrics' as any).delete().eq('user_id', user.id);
      await supabase.from('campaign_metrics').delete().eq('user_id', user.id);
      await supabase.from('leads').delete().eq('user_id', user.id);
      await supabase.from('campaigns').delete().eq('user_id', user.id);
      await supabase.from('profiles_data').delete().eq('user_id', user.id);

      toast.success('Todos os dados foram limpos com sucesso');
      onDataCleared?.();
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      toast.error('Erro ao limpar dados do banco');
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
    }
  };

  return (
    <>
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Apagar Dados
          </CardTitle>
          <CardDescription>
            Remova todos os dados de campanhas, métricas e leads do sistema. Esta ação não pode ser desfeita.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setShowConfirmDialog(true)}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? 'Limpando...' : 'Limpar Todos os Dados'}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Exclusão de Dados
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a excluir <strong>permanentemente</strong> todos os seus dados:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Todas as campanhas</li>
                <li>Todas as métricas de campanha</li>
                <li>Todos os leads (positivos, negativos e pendentes)</li>
                <li>Todos os perfis</li>
              </ul>
              <p className="font-semibold text-destructive">
                Esta ação não pode ser desfeita!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllData}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, excluir tudo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
