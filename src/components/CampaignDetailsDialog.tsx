import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

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
}

export function CampaignDetailsDialog({
  open,
  onOpenChange,
  campaignName,
  details,
}: CampaignDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Campanha</DialogTitle>
          <DialogDescription>
            Informações detalhadas sobre {campaignName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Empresa</Label>
            <p className="text-foreground font-medium">{details.company || 'Não informado'}</p>
          </div>
          
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Perfil</Label>
            <p className="text-foreground font-medium">{details.profile || 'Não informado'}</p>
          </div>
          
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Campanha</Label>
            <p className="text-foreground font-medium">{campaignName}</p>
          </div>
          
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Objetivo da Campanha</Label>
            <p className="text-foreground font-medium">{details.objective || 'Não informado'}</p>
          </div>
          
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Cadência</Label>
            <p className="text-foreground font-medium">{details.cadence || 'Não informado'}</p>
          </div>
          
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Cargos na Pesquisa</Label>
            <p className="text-foreground font-medium">{details.jobTitles || 'Não informado'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
