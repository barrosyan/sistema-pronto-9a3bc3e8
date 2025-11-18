import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Trash2, Download, FileSpreadsheet, FileText, Play } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { parseExcelSheets } from '@/utils/excelSheetParser';

type FileUpload = {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  uploaded_at: string;
};

export default function UserSettings() {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

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

  // Sanitize unsafe file names for storage keys (remove accents and special chars)
  const sanitizeFileName = (name: string) => {
    const parts = name.split('.');
    const ext = parts.length > 1 ? '.' + parts.pop()!.toLowerCase() : '';
    const base = parts.join('.');
    const ascii = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cleaned = ascii
      .replace(/[^a-zA-Z0-9._-]+/g, '-') // keep only safe chars
      .replace(/-+/g, '-')               // collapse dashes
      .replace(/^[-_.]+|[-_.]+$/g, '')   // trim leading/trailing
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
        // Validate file type
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

        // Upload to storage
        const safeOriginal = sanitizeFileName(file.name);
        const fileName = `${Date.now()}_${safeOriginal}`;
        const storagePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('user-uploads')
          .upload(storagePath, file, { contentType: file.type || undefined, upsert: false });

        if (uploadError) throw uploadError;

        // Save metadata to database
        const dbResult: any = await supabase
          .from('file_uploads' as any)
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            storage_path: storagePath
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
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user-uploads')
        .remove([file.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
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
    let totalMetrics = 0;
    let totalLeads = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      for (const fileRecord of files) {
        try {
          // Download file from storage
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('user-uploads')
            .download(fileRecord.storage_path);

          if (downloadError) throw downloadError;

          // Convert blob to File object
          const file = new File([fileData], fileRecord.file_name, { type: fileRecord.file_type });

          // Parse file
          const parsedData = await parseExcelSheets(file);

          // Insert or update campaign details if available
          if (parsedData.campaignDetails && parsedData.campaignDetails.campaignName) {
            const { data: existingCampaign } = await supabase
              .from('campaigns')
              .select('id')
              .eq('user_id', user.id)
              .eq('name', parsedData.campaignDetails.campaignName)
              .single();

            if (existingCampaign) {
              // Update existing campaign
              await supabase
                .from('campaigns')
                .update({
                  company: parsedData.campaignDetails.company || null,
                  profile_name: parsedData.campaignDetails.profile || null,
                  objective: parsedData.campaignDetails.objective || null,
                  cadence: parsedData.campaignDetails.cadence || null,
                  job_titles: parsedData.campaignDetails.jobTitles || null,
                })
                .eq('id', existingCampaign.id);
            } else {
              // Insert new campaign
              await supabase
                .from('campaigns')
                .insert({
                  user_id: user.id,
                  name: parsedData.campaignDetails.campaignName,
                  company: parsedData.campaignDetails.company || null,
                  profile_name: parsedData.campaignDetails.profile || null,
                  objective: parsedData.campaignDetails.objective || null,
                  cadence: parsedData.campaignDetails.cadence || null,
                  job_titles: parsedData.campaignDetails.jobTitles || null,
                });
            }
          }

          // Insert campaign metrics
          if (parsedData.campaignMetrics.length > 0) {
            const metricsToInsert = parsedData.campaignMetrics.map(metric => ({
              user_id: user.id,
              campaign_name: metric.campaignName,
              event_type: metric.eventType,
              profile_name: metric.profileName,
              total_count: metric.totalCount,
              daily_data: metric.dailyData,
            }));

            const { error: metricsError } = await supabase
              .from('campaign_metrics')
              .insert(metricsToInsert);

            if (metricsError) throw metricsError;
            totalMetrics += parsedData.campaignMetrics.length;
          }

          // Insert positive leads
          if (parsedData.positiveLeads.length > 0) {
            const leadsToInsert = parsedData.positiveLeads.map(lead => ({
              user_id: user.id,
              campaign: lead.campaign,
              linkedin: lead.linkedin || null,
              name: lead.name,
              position: lead.position || null,
              company: lead.company || null,
              status: 'positive',
              positive_response_date: lead.positiveResponseDate || null,
              transfer_date: lead.transferDate || null,
              status_details: lead.statusDetails || null,
              comments: lead.comments || null,
              follow_up_1_date: lead.followUp1Date || null,
              follow_up_1_comments: lead.followUp1Comments || null,
              follow_up_2_date: lead.followUp2Date || null,
              follow_up_2_comments: lead.followUp2Comments || null,
              follow_up_3_date: lead.followUp3Date || null,
              follow_up_3_comments: lead.followUp3Comments || null,
              follow_up_4_date: lead.followUp4Date || null,
              follow_up_4_comments: lead.followUp4Comments || null,
              observations: lead.observations || null,
              meeting_schedule_date: lead.meetingScheduleDate || null,
              meeting_date: lead.meetingDate || null,
              proposal_date: lead.proposalDate || null,
              proposal_value: lead.proposalValue || null,
              sale_date: lead.saleDate || null,
              sale_value: lead.saleValue || null,
              profile: lead.profile || null,
              classification: lead.classification || null,
              attended_webinar: lead.attendedWebinar || false,
              whatsapp: lead.whatsapp || null,
              stand_day: lead.standDay || null,
              pavilion: lead.pavilion || null,
              stand: lead.stand || null,
              connection_date: lead.connectionDate || null,
            }));

            const { error: leadsError } = await supabase
              .from('leads')
              .insert(leadsToInsert);

            if (leadsError) throw leadsError;
            totalLeads += parsedData.positiveLeads.length;
          }

          // Insert negative leads
          if (parsedData.negativeLeads.length > 0) {
            const leadsToInsert = parsedData.negativeLeads.map(lead => ({
              user_id: user.id,
              campaign: lead.campaign,
              linkedin: lead.linkedin || null,
              name: lead.name,
              position: lead.position || null,
              company: lead.company || null,
              status: 'negative',
              negative_response_date: lead.negativeResponseDate || null,
              transfer_date: lead.transferDate || null,
              status_details: lead.statusDetails || null,
              observations: lead.observations || null,
              had_follow_up: lead.hadFollowUp || false,
              follow_up_reason: lead.followUpReason || null,
            }));

            const { error: leadsError } = await supabase
              .from('leads')
              .insert(leadsToInsert);

            if (leadsError) throw leadsError;
            totalLeads += parsedData.negativeLeads.length;
          }

          toast.success(`Arquivo ${fileRecord.file_name} processado com sucesso!`);
        } catch (error) {
          console.error(`Erro ao processar ${fileRecord.file_name}:`, error);
          toast.error(`Erro ao processar ${fileRecord.file_name}`);
        }
      }

      toast.success(`Processamento concluído! ${totalMetrics} métricas e ${totalLeads} leads adicionados.`);
    } catch (error) {
      console.error('Error processing files:', error);
      toast.error('Erro ao processar arquivos');
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
                <Button
                  onClick={processAllFiles}
                  disabled={uploading || processing}
                  variant="default"
                  className="w-full sm:w-auto"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {processing ? 'Processando...' : 'Processar Todos os Arquivos'}
                </Button>
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
    </div>
  );
}
