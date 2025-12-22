import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeleteCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName: string;
  onDeleted: () => void;
}

export const DeleteCampaignDialog = ({
  open,
  onOpenChange,
  campaignName,
  onDeleted,
}: DeleteCampaignDialogProps) => {
  const [deleteMetrics, setDeleteMetrics] = useState(true);
  const [deleteLeads, setDeleteLeads] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Delete from campaigns table
      const { error: campaignError } = await supabase
        .from('campaigns')
        .delete()
        .eq('user_id', user.id)
        .eq('name', campaignName);

      if (campaignError) {
        console.error('Error deleting campaign:', campaignError);
        toast.error('Erro ao excluir campanha');
        return;
      }

      // Delete campaign metrics if selected
      if (deleteMetrics) {
        const { error: metricsError } = await supabase
          .from('campaign_metrics')
          .delete()
          .eq('user_id', user.id)
          .eq('campaign_name', campaignName);

        if (metricsError) {
          console.error('Error deleting campaign metrics:', metricsError);
          toast.error('Erro ao excluir métricas da campanha');
        }
      }

      // Delete leads if selected
      if (deleteLeads) {
        const { error: leadsError } = await supabase
          .from('leads')
          .delete()
          .eq('user_id', user.id)
          .eq('campaign', campaignName);

        if (leadsError) {
          console.error('Error deleting leads:', leadsError);
          toast.error('Erro ao excluir leads da campanha');
        }
      }

      toast.success('Campanha excluída com sucesso');
      onDeleted();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Erro ao excluir campanha');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Campanha</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a campanha <strong>"{campaignName}"</strong>?
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="deleteMetrics"
              checked={deleteMetrics}
              onCheckedChange={(checked) => setDeleteMetrics(checked === true)}
            />
            <Label htmlFor="deleteMetrics" className="text-sm">
              Excluir também as métricas desta campanha
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="deleteLeads"
              checked={deleteLeads}
              onCheckedChange={(checked) => setDeleteLeads(checked === true)}
            />
            <Label htmlFor="deleteLeads" className="text-sm text-destructive">
              Excluir também os leads desta campanha (cuidado!)
            </Label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
