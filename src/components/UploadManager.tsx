import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Trash2, Download, FileSpreadsheet, FileText, Play } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { parseCampaignCsv } from '@/utils/campaignCsvParser';
import { parseLeadsCsv } from '@/utils/leadsCsvParser';
import { detectCsvType, parseCsvHeaders } from '@/utils/csvDetector';
import { useProfileFilter } from '@/contexts/ProfileFilterContext';
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

export function UploadManager() {
  const { loadFromDatabase } = useCampaignData();
  const { loadProfiles } = useProfileFilter();
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

          const isCsv = fileRecord.file_name.toLowerCase().endsWith('.csv');
          
          if (isCsv) {
            const text = await fileData.text();
            const headers = parseCsvHeaders(text);
            const detection = detectCsvType(headers);
            
            console.log(`📋 Detected CSV type: ${detection.type} (confidence: ${detection.confidence})`);
            
            if (detection.type === 'campaign-input') {
              const parsedData = parseCampaignCsv(text);
              
              const profileNames = Array.from(new Set(parsedData.map(d => d.profileName)));
              const campaignNames = Array.from(new Set(parsedData.map(d => d.campaignName)));
              
              previews.push({
                fileName: fileRecord.file_name,
                campaignsCount: campaignNames.length,
                metricsCount: parsedData.reduce((sum, d) => sum + d.metrics.length, 0),
                positiveLeadsCount: 0,
                negativeLeadsCount: 0,
                campaignNames,
              });

              parsedDataArray.push({
                fileRecord,
                parsedData,
                user,
                type: 'campaign-input',
              });
            } else if (detection.type === 'leads') {
              const parsedData = parseLeadsCsv(text, fileRecord.file_name);
              
              const campaignNames = Array.from(
                new Set([
                  ...parsedData.positiveLeads.map(l => l.campaign),
                  ...parsedData.negativeLeads.map(l => l.campaign)
                ])
              ).filter(Boolean);
              
              previews.push({
                fileName: fileRecord.file_name,
                campaignsCount: 0,
                metricsCount: 0,
                positiveLeadsCount: parsedData.positiveLeads.length,
                negativeLeadsCount: parsedData.negativeLeads.length,
                campaignNames,
              });

              parsedDataArray.push({
                fileRecord,
                parsedData,
                user,
                type: 'leads',
              });
            } else {
              throw new Error('Tipo de CSV não reconhecido. Verifique se o arquivo possui as colunas corretas.');
            }
          } else {
            throw new Error('Apenas arquivos CSV são suportados');
          }

        } catch (error) {
          console.error(`Error processing file ${fileRecord.file_name}:`, error);
          toast.error(`Erro ao processar ${fileRecord.file_name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      if (previews.length > 0) {
        setPreviewData(previews);
        setParsedFilesData(parsedDataArray);
        setShowPreview(true);
      } else {
        toast.error('Nenhum arquivo foi processado com sucesso');
      }

    } catch (error) {
      console.error('Error processing files:', error);
      toast.error('Erro ao processar arquivos');
    } finally {
      setProcessing(false);
    }
  };

  const confirmImport = async () => {
    if (parsedFilesData.length === 0) return;

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      await supabase.from('campaign_metrics').delete().eq('user_id', user.id);
      await supabase.from('leads').delete().eq('user_id', user.id);
      await supabase.from('profiles_data').delete().eq('user_id', user.id);

      console.log('🗑️ Cleared existing data');

      for (const { parsedData, type } of parsedFilesData) {
        if (type === 'campaign-input') {
          const profileNames = Array.from(new Set(parsedData.map((d: any) => d.profileName)));
          for (const profileName of profileNames) {
            try {
              await supabase
                .from('profiles_data')
                .insert({
                  user_id: user.id,
                  profile_name: profileName,
                } as any);
            } catch (err) {
              console.error('Profile insert error:', err);
            }
          }

          const metricsMap = new Map<string, any>();
          
          for (const campaignData of parsedData) {
            for (const metric of campaignData.metrics) {
              const key = `${campaignData.campaignName}-${metric.eventType}-${campaignData.profileName}`;
              
              if (metricsMap.has(key)) {
                const existing = metricsMap.get(key);
                const mergedDailyData = { ...existing.daily_data };
                
                for (const [date, value] of Object.entries(metric.dailyData)) {
                  mergedDailyData[date] = (mergedDailyData[date] || 0) + (value as number);
                }
                
                existing.daily_data = mergedDailyData;
                existing.total_count = Object.values(mergedDailyData).reduce((sum: number, val) => sum + (val as number), 0);
              } else {
                metricsMap.set(key, {
                  user_id: user.id,
                  campaign_name: campaignData.campaignName,
                  event_type: metric.eventType,
                  profile_name: campaignData.profileName,
                  daily_data: metric.dailyData,
                  total_count: metric.totalCount,
                });
              }
            }
          }

          const metricsToInsert = Array.from(metricsMap.values());
          if (metricsToInsert.length > 0) {
            const { error: metricsError } = await supabase
              .from('campaign_metrics')
              .upsert(metricsToInsert, {
                onConflict: 'user_id,campaign_name,event_type,profile_name',
              });

            if (metricsError) throw metricsError;
          }

        } else if (type === 'leads') {
          const allLeads = [
            ...parsedData.positiveLeads.map((l: any) => ({
              user_id: user.id,
              campaign: l.campaign,
              name: l.name,
              linkedin: l.linkedin || null,
              position: l.position || null,
              company: l.company || null,
              source: l.source || 'Kontax',
              connection_date: l.connectionDate || l.sequenceDate || null,
              status: l.status || 'Pendente',
              positive_response_date: l.positiveResponseDate || null,
              transfer_date: l.transferDate || null,
              status_details: l.statusDetails || null,
              comments: l.comments || null,
              follow_up_1_date: l.followUp1Date || null,
              follow_up_1_comments: l.followUp1Comments || null,
              follow_up_2_date: l.followUp2Date || null,
              follow_up_2_comments: l.followUp2Comments || null,
              follow_up_3_date: l.followUp3Date || null,
              follow_up_3_comments: l.followUp3Comments || null,
              follow_up_4_date: l.followUp4Date || null,
              follow_up_4_comments: l.followUp4Comments || null,
              observations: l.observations || null,
              meeting_schedule_date: l.meetingScheduleDate || null,
              meeting_date: l.meetingDate || null,
              proposal_date: l.proposalDate || null,
              proposal_value: l.proposalValue || null,
              sale_date: l.saleDate || null,
              sale_value: l.saleValue || null,
              profile: l.profile || null,
              classification: l.classification || null,
              attended_webinar: l.attendedWebinar || false,
              whatsapp: l.whatsapp || null,
              stand_day: l.standDay || null,
              pavilion: l.pavilion || null,
              stand: l.stand || null,
            })),
            ...parsedData.negativeLeads.map((l: any) => ({
              user_id: user.id,
              campaign: l.campaign,
              name: l.name,
              linkedin: l.linkedin || null,
              position: l.position || null,
              company: l.company || null,
              source: l.source || 'Kontax',
              connection_date: l.connectionDate || l.sequenceDate || null,
              status: 'negative',
              negative_response_date: l.negativeResponseDate || null,
              had_follow_up: l.hadFollowUp || false,
              follow_up_reason: l.followUpReason || null,
              observations: l.observations || null,
            })),
          ];

          if (allLeads.length > 0) {
            const { error: leadsError } = await supabase
              .from('leads')
              .upsert(allLeads, {
                onConflict: 'user_id,campaign,name',
              });

            if (leadsError) throw leadsError;
          }
        }
      }

      toast.success('Dados importados com sucesso!');
      setShowPreview(false);
      setParsedFilesData([]);
      setPreviewData([]);
      
      await loadFromDatabase();
      await loadProfiles();
      
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Erro ao importar dados');
    } finally {
      setProcessing(false);
    }
  };

  const clearAllData = async () => {
    if (!confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('campaign_metrics').delete().eq('user_id', user.id);
      await supabase.from('leads').delete().eq('user_id', user.id);
      await supabase.from('profiles_data').delete().eq('user_id', user.id);

      toast.success('Dados limpos com sucesso!');
      await loadFromDatabase();
      await loadProfiles();
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Erro ao limpar dados');
    }
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.toLowerCase().endsWith('.csv')) {
      return <FileText className="h-5 w-5 text-green-500" />;
    }
    return <FileSpreadsheet className="h-5 w-5 text-blue-500" />;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Arquivos</CardTitle>
          <CardDescription>
            Faça upload de arquivos CSV e processe-os para popular o banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
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
                    {processing ? 'Processando...' : 'Processar Todos'}
                  </Button>
                  <Button
                    onClick={clearAllData}
                    disabled={uploading || processing}
                    variant="destructive"
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpar Dados
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
                <p>Nenhum arquivo enviado</p>
                <p className="text-sm mt-1">Faça upload de arquivos CSV</p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Upload</TableHead>
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
        onCancel={() => setShowPreview(false)}
        loading={processing}
      />
    </>
  );
}
