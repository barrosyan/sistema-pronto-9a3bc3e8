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

export default function UserSettings() {
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
            // Detect CSV type automatically
            const text = await fileData.text();
            const headers = parseCsvHeaders(text);
            const detection = detectCsvType(headers);
            
            console.log(`📋 Detected CSV type: ${detection.type} (confidence: ${detection.confidence})`);
            
            if (detection.type === 'campaign-input') {
              // Process campaign input CSV
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
              // Process leads CSV
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
            // Skip Excel for now - only CSV supported
            throw new Error('Apenas arquivos CSV são suportados');
          }

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
    let totalProfiles = 0;
    let totalCampaigns = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      console.log('🗑️ Limpando dados existentes do usuário:', user.id);
      
      // Delete in correct order
      await supabase.from('campaign_metrics').delete().eq('user_id', user.id);
      await supabase.from('leads').delete().eq('user_id', user.id);
      await supabase.from('campaigns').delete().eq('user_id', user.id);
      await supabase.from('profiles_data').delete().eq('user_id', user.id);
      
      console.log('✅ Todos os dados foram limpos');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Process each file based on type
      let totalLeads = 0;
      
      for (const { parsedData, type } of parsedFilesData) {
        if (type === 'campaign-input') {
          // Process campaign input CSV
          console.log(`📊 Processando ${parsedData.length} campaign-profile combinations`);

          for (const data of parsedData) {
            // Create profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles_data')
              .upsert({
                user_id: user.id,
                profile_name: data.profileName,
              }, {
                onConflict: 'user_id,profile_name',
                ignoreDuplicates: false,
              })
              .select()
              .single();

            if (profileError) {
              console.error('❌ Error creating profile:', profileError);
              continue;
            }

            totalProfiles++;
            console.log(`✅ Profile: ${data.profileName}`);

            // Create campaign
            const { data: campaign, error: campaignError } = await supabase
              .from('campaigns')
              .insert({
                user_id: user.id,
                profile_id: profile.id,
                name: data.campaignName,
                profile_name: data.profileName,
              })
              .select()
              .single();

            if (campaignError) {
              console.error('❌ Error creating campaign:', campaignError);
              continue;
            }

            totalCampaigns++;
            console.log(`✅ Campaign: ${data.campaignName}`);

            // Insert metrics
            for (const metric of data.metrics) {
              const { error: metricError } = await supabase
                .from('campaign_metrics')
                .insert({
                  user_id: user.id,
                  campaign_name: data.campaignName,
                  profile_name: data.profileName,
                  event_type: metric.eventType,
                  total_count: metric.totalCount,
                  daily_data: metric.dailyData,
                });

              if (metricError) {
                console.error(`❌ Error inserting metric ${metric.eventType}:`, metricError);
              } else {
                totalMetrics++;
                console.log(`✅ Metric: ${metric.eventType}`);
              }
            }
          }
        } else if (type === 'leads') {
          // Process leads CSV
          console.log(`👥 Processando leads: ${parsedData.positiveLeads.length} positivos, ${parsedData.negativeLeads.length} negativos`);
          
          // Insert positive leads
          if (parsedData.positiveLeads.length > 0) {
            const leadsToInsert = parsedData.positiveLeads.map(lead => ({
              user_id: user.id,
              campaign: lead.campaign,
              linkedin: lead.linkedin,
              name: lead.name,
              position: lead.position,
              company: lead.company,
              status: lead.status,
              source: lead.source,
              connection_date: lead.connectionDate,
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
              proposal_value: lead.proposalValue,
              sale_date: lead.saleDate,
              sale_value: lead.saleValue,
              profile: lead.profile,
              classification: lead.classification,
              attended_webinar: lead.attendedWebinar,
              whatsapp: lead.whatsapp,
              stand_day: lead.standDay,
              pavilion: lead.pavilion,
              stand: lead.stand,
            }));

            // Deduplicate leads by unique key (user_id, campaign, name)
            const uniqueLeads = leadsToInsert.reduce((acc, lead) => {
              const key = `${lead.user_id}-${lead.campaign}-${lead.name}`;
              if (!acc.has(key)) {
                acc.set(key, lead);
              }
              return acc;
            }, new Map<string, typeof leadsToInsert[0]>());

            const deduplicatedLeads = Array.from(uniqueLeads.values());
            console.log(`📊 Deduplicated ${leadsToInsert.length} leads to ${deduplicatedLeads.length} unique leads`);

            const { error: leadsError } = await supabase
              .from('leads')
              .upsert(deduplicatedLeads as any[], {
                onConflict: 'user_id,campaign,name',
                ignoreDuplicates: false
              });

            if (leadsError) {
              console.error('❌ Error inserting positive leads:', leadsError);
            } else {
              totalLeads += leadsToInsert.length;
              console.log(`✅ ${leadsToInsert.length} positive leads inserted`);
            }
          }
          
          // Insert negative leads
          if (parsedData.negativeLeads.length > 0) {
            const leadsToInsert = parsedData.negativeLeads.map(lead => ({
              user_id: user.id,
              campaign: lead.campaign,
              linkedin: lead.linkedin,
              name: lead.name,
              position: lead.position,
              company: lead.company,
              status: lead.status,
              source: lead.source,
              connection_date: lead.connectionDate,
              negative_response_date: lead.negativeResponseDate,
              had_follow_up: lead.hadFollowUp,
              follow_up_reason: lead.followUpReason,
              observations: lead.observations,
            }));

            // Deduplicate leads by unique key (user_id, campaign, name)
            const uniqueLeads = leadsToInsert.reduce((acc, lead) => {
              const key = `${lead.user_id}-${lead.campaign}-${lead.name}`;
              if (!acc.has(key)) {
                acc.set(key, lead);
              }
              return acc;
            }, new Map<string, typeof leadsToInsert[0]>());

            const deduplicatedLeads = Array.from(uniqueLeads.values());
            console.log(`📊 Deduplicated ${leadsToInsert.length} negative leads to ${deduplicatedLeads.length} unique leads`);

            const { error: leadsError } = await supabase
              .from('leads')
              .upsert(deduplicatedLeads as any[], {
                onConflict: 'user_id,campaign,name',
                ignoreDuplicates: false
              });

            if (leadsError) {
              console.error('❌ Error inserting negative leads:', leadsError);
            } else {
              totalLeads += leadsToInsert.length;
              console.log(`✅ ${leadsToInsert.length} negative leads inserted`);
            }
          }
        }
      }

      console.log('=== Importação concluída ===');
      console.log('Total perfis:', totalProfiles);
      console.log('Total campanhas:', totalCampaigns);
      console.log('Total métricas:', totalMetrics);
      console.log('Total leads:', totalLeads);
      
      await loadFromDatabase();
      await loadProfiles(); // Reload profiles after import
      setShowPreview(false);
      setParsedFilesData([]);
      setPreviewData([]);
      
      const successParts = [];
      if (totalCampaigns > 0) successParts.push(`${totalCampaigns} campanhas`);
      if (totalMetrics > 0) successParts.push(`${totalMetrics} métricas`);
      if (totalLeads > 0) successParts.push(`${totalLeads} leads`);
      
      toast.success(`Importação concluída! ${successParts.join(', ')}`);
    } catch (error: any) {
      console.error('Erro na importação:', error);
      toast.error(error.message || 'Erro ao importar dados');
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
