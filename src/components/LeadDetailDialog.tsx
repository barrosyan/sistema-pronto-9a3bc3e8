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
import { Badge } from '@/components/ui/badge';
import { Lead } from '@/types/campaign';
import { supabase } from '@/integrations/supabase/client';
import { X, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LeadDetailDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (lead: Lead) => void;
}

export function LeadDetailDialog({
  lead,
  open,
  onOpenChange,
  onSave,
}: LeadDetailDialogProps) {
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<string[]>([]);
  const [editedLead, setEditedLead] = useState<Lead | null>(lead);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [newCampaign, setNewCampaign] = useState<string>('');

  useEffect(() => {
    if (open && lead) {
      setEditedLead(lead);
      // Initialize selected campaigns from lead's campaigns array or single campaign
      const leadCampaigns = lead.campaigns || (lead.campaign ? [lead.campaign] : []);
      setSelectedCampaigns(leadCampaigns);
      loadCampaigns();
    }
  }, [open, lead]);

  const loadCampaigns = async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('name')
      .order('name');
    
    if (data && !error) {
      setAllCampaigns(data.map(c => c.name));
    }
  };

  const handleAddCampaign = () => {
    if (newCampaign && !selectedCampaigns.includes(newCampaign)) {
      setSelectedCampaigns([...selectedCampaigns, newCampaign]);
      setNewCampaign('');
    }
  };

  const handleRemoveCampaign = (campaign: string) => {
    setSelectedCampaigns(selectedCampaigns.filter(c => c !== campaign));
  };

  const handleSave = () => {
    if (!editedLead) return;
    
    const updatedLead: Lead = {
      ...editedLead,
      campaign: selectedCampaigns[0] || editedLead.campaign, // Primary campaign
      campaigns: selectedCampaigns,
    };
    
    onSave(updatedLead);
    onOpenChange(false);
  };

  if (!editedLead) return null;

  const getStatusBadge = (status: Lead['status']) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      positive: { label: 'Positivo', className: 'bg-success text-success-foreground' },
      negative: { label: 'Negativo', className: 'bg-destructive text-destructive-foreground' },
      pending: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
      'follow-up': { label: 'Follow-Up', className: 'bg-blue-500 text-white' },
      'retomar-contato': { label: 'Retomar Contato', className: 'bg-orange-500 text-white' },
      'em-negociacao': { label: 'Em Negociação', className: 'bg-purple-500 text-white' },
      'sem-interesse': { label: 'Sem Interesse', className: 'bg-gray-500 text-white' },
      'sem-fit': { label: 'Sem Fit', className: 'bg-gray-400 text-white' },
    };
    const config = statusMap[status] || { label: status, className: 'bg-muted' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Lead: {editedLead.name}</DialogTitle>
          <DialogDescription>
            Visualize e edite todas as informações do lead, incluindo campanhas associadas
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={editedLead.name}
                  onChange={(e) => setEditedLead({ ...editedLead, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <Input
                  id="company"
                  value={editedLead.company || ''}
                  onChange={(e) => setEditedLead({ ...editedLead, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Cargo</Label>
                <Input
                  id="position"
                  value={editedLead.position || ''}
                  onChange={(e) => setEditedLead({ ...editedLead, position: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={editedLead.linkedin || ''}
                  onChange={(e) => setEditedLead({ ...editedLead, linkedin: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={editedLead.whatsapp || ''}
                  onChange={(e) => setEditedLead({ ...editedLead, whatsapp: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editedLead.status}
                  onValueChange={(value) => setEditedLead({ ...editedLead, status: value as Lead['status'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="positive">Positivo</SelectItem>
                    <SelectItem value="negative">Negativo</SelectItem>
                    <SelectItem value="follow-up">Follow-Up</SelectItem>
                    <SelectItem value="retomar-contato">Retomar Contato</SelectItem>
                    <SelectItem value="em-negociacao">Em Negociação</SelectItem>
                    <SelectItem value="sem-interesse">Sem Interesse</SelectItem>
                    <SelectItem value="sem-fit">Sem Fit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select
                  value={editedLead.source || 'Kontax'}
                  onValueChange={(value) => setEditedLead({ ...editedLead, source: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kontax">Kontax</SelectItem>
                    <SelectItem value="Evento Presencial">Evento Presencial</SelectItem>
                    <SelectItem value="Indicação">Indicação</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Campanhas Associadas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campanhas Associadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {selectedCampaigns.map((campaign, idx) => (
                  <Badge 
                    key={campaign} 
                    variant={idx === 0 ? "default" : "secondary"}
                    className="flex items-center gap-1"
                  >
                    {campaign}
                    {idx === 0 && <span className="text-xs ml-1">(principal)</span>}
                    <button
                      onClick={() => handleRemoveCampaign(campaign)}
                      className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Select value={newCampaign} onValueChange={setNewCampaign}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Adicionar campanha..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allCampaigns
                      .filter(c => !selectedCampaigns.includes(c))
                      .map(campaign => (
                        <SelectItem key={campaign} value={campaign}>
                          {campaign}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddCampaign} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Datas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datas Importantes</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="connectionDate">Data de Conexão</Label>
                <Input
                  id="connectionDate"
                  type="date"
                  value={editedLead.connectionDate || ''}
                  onChange={(e) => setEditedLead({ ...editedLead, connectionDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="positiveResponseDate">Resposta Positiva</Label>
                <Input
                  id="positiveResponseDate"
                  type="date"
                  value={editedLead.positiveResponseDate || ''}
                  onChange={(e) => setEditedLead({ ...editedLead, positiveResponseDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meetingDate">Reunião</Label>
                <Input
                  id="meetingDate"
                  type="date"
                  value={editedLead.meetingDate || ''}
                  onChange={(e) => setEditedLead({ ...editedLead, meetingDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proposalDate">Proposta</Label>
                <Input
                  id="proposalDate"
                  type="date"
                  value={editedLead.proposalDate || ''}
                  onChange={(e) => setEditedLead({ ...editedLead, proposalDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saleDate">Venda</Label>
                <Input
                  id="saleDate"
                  type="date"
                  value={editedLead.saleDate || ''}
                  onChange={(e) => setEditedLead({ ...editedLead, saleDate: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Valores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Valores</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proposalValue">Valor da Proposta</Label>
                <Input
                  id="proposalValue"
                  type="number"
                  value={editedLead.proposalValue || ''}
                  onChange={(e) => setEditedLead({ ...editedLead, proposalValue: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saleValue">Valor da Venda</Label>
                <Input
                  id="saleValue"
                  type="number"
                  value={editedLead.saleValue || ''}
                  onChange={(e) => setEditedLead({ ...editedLead, saleValue: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Observações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="comments">Comentários</Label>
                <Textarea
                  id="comments"
                  value={editedLead.comments || ''}
                  onChange={(e) => setEditedLead({ ...editedLead, comments: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={editedLead.observations || ''}
                  onChange={(e) => setEditedLead({ ...editedLead, observations: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}