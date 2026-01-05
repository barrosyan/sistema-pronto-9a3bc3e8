import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, Users, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface CampaignProfileMapping {
  campaignName: string;
  profiles: string[];
  selectedProfile?: string;
}

export interface FilePreviewData {
  fileName: string;
  campaignsCount: number;
  metricsCount: number;
  positiveLeadsCount: number;
  negativeLeadsCount: number;
  pendingLeadsCount?: number;
  messagesSent?: number;
  campaignNames: string[];
  campaignProfileMappings?: CampaignProfileMapping[];
  error?: string;
  detectedType?: 'campaign-input' | 'leads' | 'hybrid';
  selectedType?: 'campaign-input' | 'leads' | 'hybrid';
  acceptanceRate?: number;
  selectedCampaign?: string; // Selected campaign for leads import
}

interface DataImportPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: FilePreviewData[];
  onConfirm: () => void;
  onCancel: () => void;
  onProfileSelect: (campaignName: string, profileName: string) => void;
  onTypeSelect?: (fileName: string, type: 'campaign-input' | 'leads' | 'hybrid') => void;
  onCampaignSelect?: (fileName: string, campaignName: string) => void;
  existingCampaigns?: { id: string; name: string }[];
  loading?: boolean;
}

export default function DataImportPreview({
  open,
  onOpenChange,
  previewData,
  onConfirm,
  onCancel,
  onProfileSelect,
  onTypeSelect,
  onCampaignSelect,
  existingCampaigns = [],
  loading = false,
}: DataImportPreviewProps) {
  const totalCampaigns = previewData.reduce((sum, f) => sum + f.campaignsCount, 0);
  const totalMetrics = previewData.reduce((sum, f) => sum + f.metricsCount, 0);
  const totalPositiveLeads = previewData.reduce((sum, f) => sum + f.positiveLeadsCount, 0);
  const totalNegativeLeads = previewData.reduce((sum, f) => sum + f.negativeLeadsCount, 0);
  const hasErrors = previewData.some(f => f.error);
  
  // Check if all campaigns with mappings have a profile selected
  const allCampaignMappings = previewData.flatMap(f => f.campaignProfileMappings || []);
  const allProfilesSelected = allCampaignMappings.length === 0 || 
    allCampaignMappings.every(m => m.selectedProfile);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Preview de Importação de Dados</DialogTitle>
          <DialogDescription>
            Revise os dados detectados antes de confirmar a importação
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Campanhas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCampaigns}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Métricas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalMetrics}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Leads +
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{totalPositiveLeads}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Leads -
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{totalNegativeLeads}</div>
                </CardContent>
              </Card>
            </div>

            {/* File Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Detalhes por Arquivo</h3>
              {previewData.map((file, index) => (
                <Card key={index} className={file.error ? 'border-destructive' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="truncate flex-1">{file.fileName}</span>
                      {file.error && (
                        <Badge variant="destructive" className="ml-2">Erro</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {file.error ? (
                      <p className="text-sm text-destructive">{file.error}</p>
                    ) : (
                      <>
                        {/* File Type Selection */}
                        {onTypeSelect && (
                          <div className="pb-2 border-b">
                            <p className="text-xs text-muted-foreground mb-2 font-semibold">
                              Tipo de importação:
                            </p>
                            <Select
                              value={file.selectedType || file.detectedType || 'hybrid'}
                              onValueChange={(value) => onTypeSelect(file.fileName, value as any)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hybrid" className="text-xs">
                                  Misto (Leads + Campanhas)
                                </SelectItem>
                                <SelectItem value="campaign-input" className="text-xs">
                                  Apenas Campanhas
                                </SelectItem>
                                <SelectItem value="leads" className="text-xs">
                                  Apenas Leads
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {file.detectedType && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Tipo detectado: {file.detectedType === 'hybrid' ? 'Misto' : file.detectedType === 'campaign-input' ? 'Campanhas' : 'Leads'}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {/* Campaign Selection for Leads Import */}
                        {(file.selectedType === 'leads' || (file.detectedType === 'leads' && !file.selectedType)) && 
                         onCampaignSelect && existingCampaigns.length > 0 && (
                          <div className="pb-2 border-b">
                            <p className="text-xs text-muted-foreground mb-2 font-semibold">
                              Associar a campanha (opcional):
                            </p>
                            <Select
                              value={file.selectedCampaign || '__use_filename__'}
                              onValueChange={(value) => onCampaignSelect(file.fileName, value === '__use_filename__' ? '' : value)}
                            >
                              <SelectTrigger className={`h-8 text-xs`}>
                                <SelectValue placeholder="Usar nome do arquivo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__use_filename__" className="text-xs">
                                  Usar nome do arquivo
                                </SelectItem>
                                {existingCampaigns.map((campaign) => (
                                  <SelectItem key={campaign.id} value={campaign.name} className="text-xs">
                                    {campaign.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">
                              {file.selectedCampaign 
                                ? `Leads serão importados para: ${file.selectedCampaign}` 
                                : `Leads serão importados com a campanha: ${file.campaignNames[0] || file.fileName.replace(/\.(csv|xlsx|xls)$/i, '').replace(/_/g, ' ')}`
                              }
                            </p>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Campanhas:</span>
                            <span className="font-medium">{file.campaignsCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Métricas:</span>
                            <span className="font-medium">{file.metricsCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total de Leads:</span>
                            <span className="font-medium">{(file.positiveLeadsCount || 0) + (file.negativeLeadsCount || 0) + (file.pendingLeadsCount || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Leads Positivos:</span>
                            <span className="font-medium text-green-600">{file.positiveLeadsCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Leads Negativos:</span>
                            <span className="font-medium text-red-600">{file.negativeLeadsCount}</span>
                          </div>
                          {file.pendingLeadsCount !== undefined && file.pendingLeadsCount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Leads Pendentes:</span>
                              <span className="font-medium text-yellow-600">{file.pendingLeadsCount}</span>
                            </div>
                          )}
                          {file.messagesSent !== undefined && file.messagesSent > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Mensagens Enviadas:</span>
                              <span className="font-medium text-purple-600">{file.messagesSent}</span>
                            </div>
                          )}
                          {file.acceptanceRate !== undefined && (
                            <div className="flex justify-between col-span-2">
                              <span className="text-muted-foreground">Taxa de Aceite:</span>
                              <span className="font-medium text-blue-600">{file.acceptanceRate.toFixed(2)}%</span>
                            </div>
                          )}
                        </div>
                        
                        {file.campaignProfileMappings && file.campaignProfileMappings.length > 0 ? (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground mb-2 font-semibold">
                              Selecione o perfil para cada campanha:
                            </p>
                            <div className="space-y-2">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[60%]">Campanha</TableHead>
                                    <TableHead className="w-[40%]">Perfil</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {file.campaignProfileMappings.map((mapping, i) => (
                                    <TableRow key={i}>
                                      <TableCell className="font-medium text-sm">
                                        {mapping.campaignName}
                                      </TableCell>
                                      <TableCell>
                                        <Select
                                          value={mapping.selectedProfile || ''}
                                          onValueChange={(value) => onProfileSelect(mapping.campaignName, value)}
                                          disabled={mapping.profiles.length === 1}
                                        >
                                          <SelectTrigger className={`h-8 text-xs ${!mapping.selectedProfile ? 'border-destructive' : ''}`}>
                                            <SelectValue placeholder="Selecione..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {mapping.profiles.map((profile) => (
                                              <SelectItem key={profile} value={profile} className="text-xs">
                                                {profile}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        ) : (
                          file.campaignNames.length > 0 && (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground mb-2">Campanhas detectadas:</p>
                              <div className="flex flex-wrap gap-1">
                                {file.campaignNames.map((name, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!allProfilesSelected && (
            <p className="text-sm text-destructive text-left flex-1">
              Selecione um perfil para todas as campanhas antes de continuar
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={onConfirm} disabled={loading || hasErrors || !allProfilesSelected}>
              {loading ? 'Processando...' : 'Confirmar Importação'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
