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

export interface FilePreviewData {
  fileName: string;
  campaignsCount: number;
  metricsCount: number;
  positiveLeadsCount: number;
  negativeLeadsCount: number;
  campaignNames: string[];
  error?: string;
}

interface DataImportPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: FilePreviewData[];
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function DataImportPreview({
  open,
  onOpenChange,
  previewData,
  onConfirm,
  onCancel,
  loading = false,
}: DataImportPreviewProps) {
  const totalCampaigns = previewData.reduce((sum, f) => sum + f.campaignsCount, 0);
  const totalMetrics = previewData.reduce((sum, f) => sum + f.metricsCount, 0);
  const totalPositiveLeads = previewData.reduce((sum, f) => sum + f.positiveLeadsCount, 0);
  const totalNegativeLeads = previewData.reduce((sum, f) => sum + f.negativeLeadsCount, 0);
  const hasErrors = previewData.some(f => f.error);

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
                            <span className="text-muted-foreground">Leads Positivos:</span>
                            <span className="font-medium text-green-600">{file.positiveLeadsCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Leads Negativos:</span>
                            <span className="font-medium text-red-600">{file.negativeLeadsCount}</span>
                          </div>
                        </div>
                        
                        {file.campaignNames.length > 0 && (
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
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading || hasErrors}>
            {loading ? 'Processando...' : 'Confirmar Importação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
