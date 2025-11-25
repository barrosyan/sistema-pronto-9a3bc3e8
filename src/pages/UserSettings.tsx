import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Trash2, Download, FileSpreadsheet, FileText, Play } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { parseExcelSheets } from '@/utils/excelSheetParser';
import DataImportPreview, { FilePreviewData } from '@/components/DataImportPreview';
import { useCampaignData } from '@/hooks/useCampaignData';

type FileUpload = {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_at: string;
};

export default function UserSettings() {
  const { loadFromDatabase } = useCampaignData();
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<FilePreviewData[]>([]);
  const [parsedFilesData, setParsedFilesData] = useState<any[]>([]);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const result: any = await supabase
        .from('file_uploads' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (result.error) throw result.error;
      setFiles(result.data || []);
    } catch (error) {
      console.error('Error loading files:', error);
      toast.error('Erro ao carregar arquivos');
    } finally {
      setLoading(false);
    }
  };

  const sanitizeFileName = (name: string) => {
    const parts = name.split('.');
    const ext = parts.length > 1 ? '.' + parts.pop()!.toLowerCase() : '';
    const base = parts.join('.');
    const ascii = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cleaned = ascii
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-_.]+|[-_.]+$/g, '')
      .toLowerCase();
    return (cleaned || 'file') + ext;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      for (const file of Array.from(selectedFiles)) {
        const validTypes = [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.oasis.opendocument.spreadsheet'
        ];
        
        if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls|ods)$/i)) {
          toast.error(`Arquivo ${file.name} não é um CSV ou Excel válido`);
          continue;
        }

        const safeOriginal = sanitizeFileName(file.name);
        const fileName = `${Date.now()}_${safeOriginal}`;
        const storagePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('user-uploads')
          .upload(storagePath, file, { contentType: file.type || undefined, upsert: false });

        if (uploadError) throw uploadError;

        const dbResult: any = await supabase
          .from('file_uploads' as any)
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            storage_path: storagePath,
          });

        if (dbResult.error) throw dbResult.error;
      }

      toast.success('Arquivos enviados com sucesso!');
      loadFiles();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Erro ao enviar arquivos');
    } finally {
      setUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleDelete = async (file: FileUpload) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('user-uploads')
        .remove([file.storage_path]);

      if (storageError) throw storageError;

      const dbResult: any = await supabase
        .from('file_uploads' as any)
        .delete()
        .eq('id', file.id);

      if (dbResult.error) throw dbResult.error;

      toast.success('Arquivo deletado com sucesso');
      loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Erro ao deletar arquivo');
    }
  };

  const handleDownload = async (file: FileUpload) => {
    try {
      const { data, error } = await supabase.storage
        .from('user-uploads')
        .download(file.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Download iniciado');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const processAllFiles = async () => {
    if (files.length === 0) {
      toast.error('Nenhum arquivo para processar');
      return;
    }

    setProcessing(true);
    const previews: FilePreviewData[] = [];
    const parsedDataArray: any[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      for (const fileRecord of files) {
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('user-uploads')
            .download(fileRecord.storage_path);

          if (downloadError) throw downloadError;

          const file = new File([fileData], fileRecord.file_name, { type: fileRecord.file_type });
          const parsedData = await parseExcelSheets(file);

          const campaignNames = Array.from(
            new Set([
              ...(parsedData.allCampaignDetails || []).map(d => d.campaignName).filter(Boolean),
              ...parsedData.campaignMetrics.map(m => m.campaignName).filter(Boolean)
            ])
          ) as string[];

          // Contar leads por status
          const pendingLeads = parsedData.positiveLeads.filter((l: any) => l.status === 'pending').length;
          const positiveLeads = parsedData.positiveLeads.filter((l: any) => l.status === 'positive').length;
          const negativeLeads = parsedData.negativeLeads.filter((l: any) => l.status === 'negative').length;

          previews.push({
            fileName: fileRecord.file_name,
            campaignsCount: parsedData.allCampaignDetails?.length || 0,
            metricsCount: parsedData.campaignMetrics.length,
            positiveLeadsCount: pendingLeads, // CSV leads são pendentes
            negativeLeadsCount: negativeLeads,
            campaignNames,
          });

          parsedDataArray.push({
            fileRecord,
            parsedData,
            user,
          });

        } catch (error) {
          console.error(`Error parsing file ${fileRecord.file_name}:`, error);
          previews.push({
            fileName: fileRecord.file_name,
            campaignsCount: 0,
            metricsCount: 0,
            positiveLeadsCount: 0,
            negativeLeadsCount: 0,
            campaignNames: [],
            error: error instanceof Error ? error.message : 'Erro ao processar arquivo',
          });
        }
      }

      setPreviewData(previews);
      setParsedFilesData(parsedDataArray);
      setShowPreview(true);

    } catch (error) {
      console.error('Error processing files:', error);
      toast.error('Erro ao processar arquivos');
    } finally {
      setProcessing(false);
    }
  };

  const clearAllData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Delete all user data
      await supabase.from('campaign_metrics').delete().eq('user_id', user.id);
      await supabase.from('leads').delete().eq('user_id', user.id);
      await supabase.from('campaigns').delete().eq('user_id', user.id);

      toast.success('Todos os dados foram limpos com sucesso');
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      toast.error('Erro ao limpar dados do banco');
    }
  };

  const confirmImport = async () => {
    console.log('=== Iniciando importação ===');
    console.log('Arquivos parseados:', parsedFilesData.length);
    
    setProcessing(true);
    let totalMetrics = 0;
    let totalLeads = 0;

    try {
      // CRITICAL: Clear all existing data before import
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      console.log('🗑️ Limpando dados existentes do usuário:', user.id);
      
      // Delete in correct order to respect foreign keys: metrics and leads first, then campaigns
      const { data: metricsData, error: metricsDeleteError } = await supabase
        .from('campaign_metrics')
        .delete()
        .eq('user_id', user.id)
        .select('id');
      
      if (metricsDeleteError) {
        console.error('❌ Erro ao deletar métricas:', metricsDeleteError);
        throw new Error('Falha ao limpar métricas: ' + metricsDeleteError.message);
      }
      console.log(`✅ ${metricsData?.length || 0} métricas deletadas`);

      const { data: leadsData, error: leadsDeleteError } = await supabase
        .from('leads')
        .delete()
        .eq('user_id', user.id)
        .select('id');
      
      if (leadsDeleteError) {
        console.error('❌ Erro ao deletar leads:', leadsDeleteError);
        throw new Error('Falha ao limpar leads: ' + leadsDeleteError.message);
      }
      console.log(`✅ ${leadsData?.length || 0} leads deletados`);

      const { data: campaignsData, error: campaignsDeleteError } = await supabase
        .from('campaigns')
        .delete()
        .eq('user_id', user.id)
        .select('id');
      
      if (campaignsDeleteError) {
        console.error('❌ Erro ao deletar campanhas:', campaignsDeleteError);
        throw new Error('Falha ao limpar campanhas: ' + campaignsDeleteError.message);
      }
      console.log(`✅ ${campaignsData?.length || 0} campanhas deletadas`);
      
      console.log('✅ Todos os dados foram limpos com sucesso');
      
      // Aguardar um pouco para garantir que o banco processou as deleções
      await new Promise(resolve => setTimeout(resolve, 500));

      // STEP 1: Consolidate ALL data from ALL files BEFORE inserting
      console.log('=== CONSOLIDANDO DADOS DE TODOS OS ARQUIVOS ===');
      
      const allCampaignDetailsMap = new Map<string, any>();
      const allMetricsMap = new Map<string, any>();
      const allLeadsMap = new Map<string, any>();
      
      // Consolidate data from all files
      for (const { parsedData } of parsedFilesData) {
        console.log('Consolidando arquivo com:', {
          campanhas: parsedData.allCampaignDetails?.length,
          metricas: parsedData.campaignMetrics.length,
          leadsPositivos: parsedData.positiveLeads.length,
          leadsNegativos: parsedData.negativeLeads.length
        });
        
        // Consolidate campaign details
        const campaignDetailsArray = parsedData.allCampaignDetails || 
          (parsedData.campaignDetails ? [parsedData.campaignDetails] : []);
        
        campaignDetailsArray.forEach(detail => {
          if (detail.campaignName) {
            allCampaignDetailsMap.set(detail.campaignName, detail);
          }
        });
        
        // Consolidate campaign names from metrics
        parsedData.campaignMetrics.forEach(metric => {
          if (metric.campaignName && !allCampaignDetailsMap.has(metric.campaignName)) {
            allCampaignDetailsMap.set(metric.campaignName, { campaignName: metric.campaignName });
          }
        });
        
        // Consolidate metrics
        parsedData.campaignMetrics.forEach(metric => {
          const key = `${metric.campaignName}|${metric.eventType}|${metric.profileName}`;
          
          if (allMetricsMap.has(key)) {
            const existing = allMetricsMap.get(key)!;
            const mergedDailyData = { ...existing.dailyData };
            
            Object.entries(metric.dailyData).forEach(([date, value]) => {
              mergedDailyData[date] = (mergedDailyData[date] || 0) + (typeof value === 'number' ? value : 0);
            });
            
            const mergedTotalCount = Object.values(mergedDailyData).reduce((sum: number, val) => {
              const numVal = typeof val === 'number' ? val : 0;
              return sum + numVal;
            }, 0);
            
            allMetricsMap.set(key, {
              ...existing,
              dailyData: mergedDailyData,
              totalCount: mergedTotalCount
            });
          } else {
            allMetricsMap.set(key, metric);
          }
        });
        
        // Consolidate positive leads
        parsedData.positiveLeads.forEach(lead => {
          const key = `${lead.campaign}|${lead.name}`;
          if (!allLeadsMap.has(key)) {
            allLeadsMap.set(key, lead);
          }
        });
        
        // Consolidate negative leads
        parsedData.negativeLeads.forEach(lead => {
          const key = `${lead.campaign}|${lead.name}`;
          if (!allLeadsMap.has(key)) {
            allLeadsMap.set(key, lead);
          }
        });
      }
      
      console.log('✅ Consolidação completa:', {
        campanhas: allCampaignDetailsMap.size,
        metricas: allMetricsMap.size,
        leads: allLeadsMap.size
      });

      // STEP 2: Insert campaigns
      console.log('=== INSERINDO CAMPANHAS ===');
      const campaignsToInsert = Array.from(allCampaignDetailsMap.values()).map(detail => ({
        user_id: user.id,
        name: detail.campaignName,
        company: detail.company || null,
        profile_name: detail.profile || null,
        objective: detail.objective || null,
        cadence: detail.cadence || null,
        job_titles: detail.jobTitles || null,
      }));
      
      const { error: campaignsError } = await supabase
        .from('campaigns')
        .upsert(campaignsToInsert, {
          onConflict: 'user_id,name',
          ignoreDuplicates: false
        });
      
      if (campaignsError) {
        console.error('Erro ao inserir campanhas:', campaignsError);
        throw campaignsError;
      }
      console.log(`✅ ${campaignsToInsert.length} campanhas inseridas`);

      // STEP 3: Insert metrics
      if (allMetricsMap.size > 0) {
        console.log('=== INSERINDO MÉTRICAS ===');
        const metricsToInsert = Array.from(allMetricsMap.values()).map(metric => ({
          user_id: user.id,
          campaign_name: metric.campaignName,
          event_type: metric.eventType,
          profile_name: metric.profileName,
          total_count: metric.totalCount,
          daily_data: metric.dailyData,
        }));

        const { error: metricsError } = await supabase
          .from('campaign_metrics')
          .upsert(metricsToInsert, {
            onConflict: 'user_id,campaign_name,event_type,profile_name',
            ignoreDuplicates: false
          });

        if (metricsError) {
          console.error('Erro ao inserir métricas:', metricsError);
          throw metricsError;
        }
        console.log(`✅ ${metricsToInsert.length} métricas inseridas`);
        totalMetrics = metricsToInsert.length;
      }

      // STEP 4: Insert leads
      if (allLeadsMap.size > 0) {
        console.log('=== INSERINDO LEADS ===');
        const leadsToInsert = Array.from(allLeadsMap.values()).map(lead => ({
          user_id: user.id,
          campaign: lead.campaign,
          linkedin: lead.linkedin,
          name: lead.name,
          position: lead.position,
          company: lead.company,
          status: lead.status,
          positive_response_date: lead.positiveResponseDate,
          transfer_date: lead.transferDate,
          status_details: lead.statusDetails,
          comments: lead.comments,
          follow_up_1_date: lead.followUp1Date,
          follow_up_1_comments: lead.followUp1Comments,
          follow_up_2_date: lead.followUp2Date,
          follow_up_2_comments: lead.followUp2Comments,
          follow_up_3_date: lead.followUp3Date,
          follow_up_3_comments: lead.followUp3Comments,
          follow_up_4_date: lead.followUp4Date,
          follow_up_4_comments: lead.followUp4Comments,
          observations: lead.observations,
          meeting_schedule_date: lead.meetingScheduleDate,
          meeting_date: lead.meetingDate,
          proposal_date: lead.proposalDate,
          proposal_value: lead.proposalValue != null ? Number(lead.proposalValue) : null,
          sale_date: lead.saleDate,
          sale_value: lead.saleValue != null ? Number(lead.saleValue) : null,
          profile: lead.profile,
          classification: lead.classification,
          attended_webinar: lead.attendedWebinar,
          whatsapp: lead.whatsapp,
          stand_day: lead.standDay,
          pavilion: lead.pavilion,
          stand: lead.stand,
          source: lead.source,
          connection_date: lead.connectionDate,
        }));

        const { error: leadsError } = await supabase
          .from('leads')
          .upsert(leadsToInsert, {
            onConflict: 'user_id,campaign,name',
            ignoreDuplicates: false
          });

        if (leadsError) {
          console.error('Erro ao inserir leads:', leadsError);
          throw leadsError;
        }
        console.log(`✅ ${leadsToInsert.length} leads inseridos`);
        totalLeads = leadsToInsert.length;
      }

      console.log('=== Importação concluída ===');
      console.log('Total métricas:', totalMetrics);
      console.log('Total leads:', totalLeads);
      
      // Reload data in the frontend
      await loadFromDatabase();
      console.log('Dados recarregados no frontend');
      
      setShowPreview(false);
      setParsedFilesData([]);
      setPreviewData([]);
      toast.success(`Importação concluída! ${totalMetrics} métricas e ${totalLeads} leads adicionados.`);
    } catch (error: any) {
      console.error('=== Erro na importação ===');
      console.error('Detalhes do erro:', error);
      
      // Mostrar mensagem de erro detalhada na tela
      const errorMessage = error?.message || 'Erro desconhecido';
      const errorCode = error?.code || '';
      const errorDetails = error?.details || '';
      
      let userMessage = 'Erro ao importar dados';
      if (errorMessage.includes('duplicate key')) {
        userMessage = 'Alguns dados já existem no banco. Tente limpar os dados antes de importar.';
      } else if (errorMessage.includes('violates')) {
        userMessage = `Erro de validação: ${errorMessage}`;
      } else {
        userMessage = `${errorMessage}${errorCode ? ` (Código: ${errorCode})` : ''}${errorDetails ? ` - ${errorDetails}` : ''}`;
      }
      
      toast.error(userMessage, { duration: 10000 });
    } finally {
      setProcessing(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.match(/\.csv$/i)) {
      return <FileText className="h-5 w-5 text-primary" />;
    }
    return <FileSpreadsheet className="h-5 w-5 text-primary" />;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Configurações do Usuário</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus arquivos de dados</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meus Arquivos</CardTitle>
          <CardDescription>
            Faça upload de arquivos CSV e Excel e processe-os para popular o banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls,.ods"
                multiple
                onChange={handleFileUpload}
                disabled={uploading || processing}
                className="hidden"
              />
              <Button
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={uploading || processing}
                className="w-full sm:w-auto"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? 'Enviando...' : 'Fazer Upload'}
              </Button>
              {files.length > 0 && (
                <>
                  <Button
                    onClick={processAllFiles}
                    disabled={uploading || processing}
                    variant="default"
                    className="w-full sm:w-auto"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {processing ? 'Processando...' : 'Processar Todos os Arquivos'}
                  </Button>
                  <Button
                    onClick={clearAllData}
                    disabled={uploading || processing}
                    variant="destructive"
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpar Banco de Dados
                  </Button>
                </>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando arquivos...
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileSpreadsheet className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p>Nenhum arquivo enviado ainda</p>
                <p className="text-sm mt-1">Faça upload de seus arquivos CSV ou Excel</p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Nome do Arquivo</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Data de Upload</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell>{getFileIcon(file.file_name)}</TableCell>
                        <TableCell className="font-medium">{file.file_name}</TableCell>
                        <TableCell>{formatFileSize(file.file_size)}</TableCell>
                        <TableCell>
                          {new Date(file.uploaded_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(file)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(file)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <DataImportPreview
        open={showPreview}
        onOpenChange={setShowPreview}
        previewData={previewData}
        onConfirm={confirmImport}
        onCancel={() => {
          setShowPreview(false);
          setParsedFilesData([]);
          setPreviewData([]);
        }}
        loading={processing}
      />
    </div>
  );
}
