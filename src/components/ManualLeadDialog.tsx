import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Lead } from '@/types/campaign';
import { supabase } from '@/integrations/supabase/client';

interface ManualLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (lead: Partial<Lead>) => void;
}

export function ManualLeadDialog({
  open,
  onOpenChange,
  onSave,
}: ManualLeadDialogProps) {
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [sourceType, setSourceType] = useState<'campaign' | 'custom'>('campaign');
  const [formData, setFormData] = useState<Partial<Lead>>({
    status: 'pending',
    source: '',
  });

  useEffect(() => {
    if (open) {
      loadCampaigns();
      // Reset form
      setFormData({ status: 'pending', source: '' });
      setSourceType('campaign');
    }
  }, [open]);

  const loadCampaigns = async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('name')
      .order('name');
    
    if (data && !error) {
      setCampaigns(data.map(c => c.name));
    }
  };

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.name || !formData.campaign) {
      return;
    }

    onSave(formData);
    onOpenChange(false);
  };

  const handleInputChange = (field: keyof Lead, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Lead Manualmente</DialogTitle>
          <DialogDescription>
            Preencha os dados do lead abaixo
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Informações Básicas</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Nome completo do lead"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <Input
                  id="company"
                  value={formData.company || ''}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  placeholder="Nome da empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Cargo</Label>
                <Input
                  id="position"
                  value={formData.position || ''}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  placeholder="Cargo do lead"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={formData.linkedin || ''}
                  onChange={(e) => handleInputChange('linkedin', e.target.value)}
                  placeholder="URL do perfil LinkedIn"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp || ''}
                  onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                  placeholder="Número de WhatsApp"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value as Lead['status'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="positive">Positivo</SelectItem>
                    <SelectItem value="negative">Negativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Source/Campanha */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Source/Campanha *</h3>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={sourceType === 'campaign' ? 'default' : 'outline'}
                  onClick={() => setSourceType('campaign')}
                  className="flex-1"
                >
                  Selecionar Campanha
                </Button>
                <Button
                  type="button"
                  variant={sourceType === 'custom' ? 'default' : 'outline'}
                  onClick={() => setSourceType('custom')}
                  className="flex-1"
                >
                  Digitar Source
                </Button>
              </div>

              {sourceType === 'campaign' ? (
                <Select
                  value={formData.campaign || ''}
                  onValueChange={(value) => {
                    handleInputChange('campaign', value);
                    handleInputChange('source', value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma campanha" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map(campaign => (
                      <SelectItem key={campaign} value={campaign}>
                        {campaign}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={formData.source || ''}
                    onChange={(e) => {
                      handleInputChange('source', e.target.value);
                      handleInputChange('campaign', e.target.value);
                    }}
                    placeholder="Digite o source/origem do lead"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Datas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Datas</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="connectionDate">Data de Conexão</Label>
                <Input
                  id="connectionDate"
                  type="date"
                  value={formData.connectionDate || ''}
                  onChange={(e) => handleInputChange('connectionDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="positiveResponseDate">Data Resposta Positiva</Label>
                <Input
                  id="positiveResponseDate"
                  type="date"
                  value={formData.positiveResponseDate || ''}
                  onChange={(e) => handleInputChange('positiveResponseDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meetingDate">Data de Reunião</Label>
                <Input
                  id="meetingDate"
                  type="date"
                  value={formData.meetingDate || ''}
                  onChange={(e) => handleInputChange('meetingDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proposalDate">Data de Proposta</Label>
                <Input
                  id="proposalDate"
                  type="date"
                  value={formData.proposalDate || ''}
                  onChange={(e) => handleInputChange('proposalDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="saleDate">Data de Venda</Label>
                <Input
                  id="saleDate"
                  type="date"
                  value={formData.saleDate || ''}
                  onChange={(e) => handleInputChange('saleDate', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Valores */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Valores</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proposalValue">Valor da Proposta</Label>
                <Input
                  id="proposalValue"
                  type="number"
                  value={formData.proposalValue || ''}
                  onChange={(e) => handleInputChange('proposalValue', parseFloat(e.target.value))}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="saleValue">Valor da Venda</Label>
                <Input
                  id="saleValue"
                  type="number"
                  value={formData.saleValue || ''}
                  onChange={(e) => handleInputChange('saleValue', parseFloat(e.target.value))}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Observações e Comentários</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="comments">Comentários</Label>
                <Textarea
                  id="comments"
                  value={formData.comments || ''}
                  onChange={(e) => handleInputChange('comments', e.target.value)}
                  placeholder="Comentários sobre o lead"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={formData.observations || ''}
                  onChange={(e) => handleInputChange('observations', e.target.value)}
                  placeholder="Observações adicionais"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Outros */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Outras Informações</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile">Perfil</Label>
                <Input
                  id="profile"
                  value={formData.profile || ''}
                  onChange={(e) => handleInputChange('profile', e.target.value)}
                  placeholder="Perfil do lead"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="classification">Classificação</Label>
                <Input
                  id="classification"
                  value={formData.classification || ''}
                  onChange={(e) => handleInputChange('classification', e.target.value)}
                  placeholder="Classificação"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="attendedWebinar"
                  checked={formData.attendedWebinar || false}
                  onCheckedChange={(checked) => handleInputChange('attendedWebinar', checked)}
                />
                <Label htmlFor="attendedWebinar" className="cursor-pointer">
                  Participou do Webinar
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.name || !formData.campaign}
          >
            Salvar Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
