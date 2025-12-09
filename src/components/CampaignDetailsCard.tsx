import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CampaignDetailsCardProps {
  campaign: string;
  details?: {
    company?: string;
    profile?: string;
    objective?: string;
    cadence?: string;
    jobTitles?: string;
    startDate?: string;
    endDate?: string;
  };
  onUpdate?: () => void;
}

export function CampaignDetailsCard({ campaign, details, onUpdate }: CampaignDetailsCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    company: details?.company || '',
    profile: details?.profile || '',
    objective: details?.objective || '',
    cadence: details?.cadence || '',
    jobTitles: details?.jobTitles || '',
    startDate: details?.startDate || '',
    endDate: details?.endDate || '',
  });

  const hasChanges = 
    formData.company !== (details?.company || '') ||
    formData.profile !== (details?.profile || '') ||
    formData.objective !== (details?.objective || '') ||
    formData.cadence !== (details?.cadence || '') ||
    formData.jobTitles !== (details?.jobTitles || '') ||
    formData.startDate !== (details?.startDate || '') ||
    formData.endDate !== (details?.endDate || '');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Check if campaign exists
      const { data: existingCampaign, error: fetchError } = await supabase
        .from('campaigns')
        .select('id')
        .eq('name', campaign)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (existingCampaign) {
        // Update existing campaign
        const { error: updateError } = await supabase
          .from('campaigns')
          .update({
            company: formData.company || null,
            profile_name: formData.profile || null,
            objective: formData.objective || null,
            cadence: formData.cadence || null,
            job_titles: formData.jobTitles || null,
            start_date: formData.startDate || null,
            end_date: formData.endDate || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingCampaign.id);

        if (updateError) throw updateError;
      } else {
        // Create new campaign record
        const { error: insertError } = await supabase
          .from('campaigns')
          .insert({
            user_id: user.id,
            name: campaign,
            company: formData.company || null,
            profile_name: formData.profile || null,
            objective: formData.objective || null,
            cadence: formData.cadence || null,
            job_titles: formData.jobTitles || null,
            start_date: formData.startDate || null,
            end_date: formData.endDate || null,
          });

        if (insertError) throw insertError;
      }

      toast.success('Detalhes salvos com sucesso!');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving campaign details:', error);
      toast.error('Erro ao salvar detalhes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{campaign}</CardTitle>
        <CardDescription>Detalhes da Campanha</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`startDate-${campaign}`} className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Data Início
            </Label>
            <Input
              id={`startDate-${campaign}`}
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`endDate-${campaign}`} className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Data Fim
            </Label>
            <Input
              id={`endDate-${campaign}`}
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="h-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`company-${campaign}`} className="text-xs text-muted-foreground">
            Empresa
          </Label>
          <Input
            id={`company-${campaign}`}
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="Nome da empresa"
            className="h-9"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`profile-${campaign}`} className="text-xs text-muted-foreground">
            Perfil
          </Label>
          <Input
            id={`profile-${campaign}`}
            value={formData.profile}
            onChange={(e) => setFormData({ ...formData, profile: e.target.value })}
            placeholder="Nome do perfil"
            className="h-9"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`objective-${campaign}`} className="text-xs text-muted-foreground">
            Objetivo da Campanha
          </Label>
          <Textarea
            id={`objective-${campaign}`}
            value={formData.objective}
            onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
            placeholder="Descreva o objetivo"
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`cadence-${campaign}`} className="text-xs text-muted-foreground">
            Cadência
          </Label>
          <Textarea
            id={`cadence-${campaign}`}
            value={formData.cadence}
            onChange={(e) => setFormData({ ...formData, cadence: e.target.value })}
            placeholder="Descrição da cadência"
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`jobTitles-${campaign}`} className="text-xs text-muted-foreground">
            Cargos na Pesquisa
          </Label>
          <Input
            id={`jobTitles-${campaign}`}
            value={formData.jobTitles}
            onChange={(e) => setFormData({ ...formData, jobTitles: e.target.value })}
            placeholder="Cargos alvo"
            className="h-9"
          />
        </div>

        {hasChanges && (
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full"
            size="sm"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
