import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CampaignDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName: string;
  details: {
    company?: string;
    profile?: string;
    objective?: string;
    cadence?: string;
    jobTitles?: string;
  };
  onUpdate?: () => void;
}

export function CampaignDetailsDialog({
  open,
  onOpenChange,
  campaignName,
  details,
  onUpdate,
}: CampaignDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    company: '',
    profile: '',
    objective: '',
    cadence: '',
    jobTitles: '',
  });

  useEffect(() => {
    setFormData({
      company: details.company || '',
      profile: details.profile || '',
      objective: details.objective || '',
      cadence: details.cadence || '',
      jobTitles: details.jobTitles || '',
    });
    setIsEditing(false);
  }, [details, open]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Buscar a campanha existente
      const { data: existingCampaign, error: fetchError } = await supabase
        .from('campaigns')
        .select('id')
        .eq('name', campaignName)
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingCampaign) {
        // Atualizar campanha existente
        const { error: updateError } = await supabase
          .from('campaigns')
          .update({
            company: formData.company,
            profile_name: formData.profile,
            objective: formData.objective,
            cadence: formData.cadence,
            job_titles: formData.jobTitles,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingCampaign.id);

        if (updateError) throw updateError;
      } else {
        // Criar nova campanha
        const { error: insertError } = await supabase
          .from('campaigns')
          .insert({
            user_id: user.id,
            name: campaignName,
            company: formData.company,
            profile_name: formData.profile,
            objective: formData.objective,
            cadence: formData.cadence,
            job_titles: formData.jobTitles,
          });

        if (insertError) throw insertError;
      }

      toast.success('Detalhes da campanha atualizados com sucesso!');
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error saving campaign details:', error);
      toast.error('Erro ao salvar detalhes da campanha');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      company: details.company || '',
      profile: details.profile || '',
      objective: details.objective || '',
      cadence: details.cadence || '',
      jobTitles: details.jobTitles || '',
    });
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Campanha</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Editar informações da campanha' : `Informações detalhadas sobre ${campaignName}`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Empresa</Label>
            {isEditing ? (
              <Input
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Nome da empresa"
              />
            ) : (
              <p className="text-foreground font-medium">{details.company || 'Não informado'}</p>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Perfil</Label>
            {isEditing ? (
              <Input
                value={formData.profile}
                onChange={(e) => setFormData({ ...formData, profile: e.target.value })}
                placeholder="Nome do perfil"
              />
            ) : (
              <p className="text-foreground font-medium">{details.profile || 'Não informado'}</p>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Campanha</Label>
            <p className="text-foreground font-medium">{campaignName}</p>
          </div>
          
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Objetivo da Campanha</Label>
            {isEditing ? (
              <Textarea
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                placeholder="Descreva o objetivo da campanha"
                rows={3}
              />
            ) : (
              <p className="text-foreground font-medium">{details.objective || 'Não informado'}</p>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Cadência</Label>
            {isEditing ? (
              <Textarea
                value={formData.cadence}
                onChange={(e) => setFormData({ ...formData, cadence: e.target.value })}
                placeholder="Descrição da cadência"
                rows={2}
              />
            ) : (
              <p className="text-foreground font-medium">{details.cadence || 'Não informado'}</p>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Cargos na Pesquisa</Label>
            {isEditing ? (
              <Input
                value={formData.jobTitles}
                onChange={(e) => setFormData({ ...formData, jobTitles: e.target.value })}
                placeholder="Cargos alvo"
              />
            ) : (
              <p className="text-foreground font-medium">{details.jobTitles || 'Não informado'}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Editar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
