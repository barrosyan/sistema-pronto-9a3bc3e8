import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lead } from '@/types/campaign';
import { toast } from 'sonner';

interface LeadEditDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (lead: Lead) => void;
}

export const LeadEditDialog = ({ lead, open, onOpenChange, onSave }: LeadEditDialogProps) => {
  const [editedLead, setEditedLead] = useState<Lead | null>(lead);

  // Update editedLead when lead prop changes
  useEffect(() => {
    if (lead) {
      setEditedLead(lead);
    }
  }, [lead]);

  if (!editedLead) return null;

  const handleSave = () => {
    if (!editedLead.name || !editedLead.campaign) {
      toast.error('Nome e Campanha são obrigatórios');
      return;
    }
    onSave(editedLead);
    toast.success('Lead atualizado com sucesso!');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Lead</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={editedLead.name}
                onChange={(e) => setEditedLead({ ...editedLead, name: e.target.value })}
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                value={editedLead.company || ''}
                onChange={(e) => setEditedLead({ ...editedLead, company: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={editedLead.status} 
                onValueChange={(value) => setEditedLead({ ...editedLead, status: value as Lead['status'] })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">Positivo</SelectItem>
                  <SelectItem value="negative">Negativo</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="follow-up">Follow-Up</SelectItem>
                  <SelectItem value="retomar-contato">Retomar Contato</SelectItem>
                  <SelectItem value="em-negociacao">Em Negociação</SelectItem>
                  <SelectItem value="sem-interesse">Sem Interesse</SelectItem>
                  <SelectItem value="sem-fit">Sem Fit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                value={editedLead.linkedin || ''}
                onChange={(e) => setEditedLead({ ...editedLead, linkedin: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select 
                value={editedLead.source || 'Kontax'} 
                onValueChange={(value) => setEditedLead({ ...editedLead, source: value })}
              >
                <SelectTrigger id="source">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign">Campanha</Label>
            <Input
              id="campaign"
              value={editedLead.campaign}
              onChange={(e) => setEditedLead({ ...editedLead, campaign: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="connectionDate">Data de Conexão</Label>
            <Input
              id="connectionDate"
              type="date"
              value={editedLead.connectionDate || ''}
              onChange={(e) => setEditedLead({ ...editedLead, connectionDate: e.target.value })}
            />
          </div>

          {editedLead.status === 'positive' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="meetingDate">Data da Reunião</Label>
                  <Input
                    id="meetingDate"
                    type="date"
                    value={editedLead.meetingDate || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, meetingDate: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="proposalDate">Data da Proposta</Label>
                  <Input
                    id="proposalDate"
                    type="date"
                    value={editedLead.proposalDate || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, proposalDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="saleDate">Data da Venda</Label>
                  <Input
                    id="saleDate"
                    type="date"
                    value={editedLead.saleDate || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, saleDate: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="saleValue">Valor da Venda</Label>
                  <Input
                    id="saleValue"
                    type="number"
                    value={editedLead.saleValue || ''}
                    onChange={(e) => setEditedLead({ ...editedLead, saleValue: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={editedLead.observations || ''}
              onChange={(e) => setEditedLead({ ...editedLead, observations: e.target.value })}
              rows={4}
            />
          </div>
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
};