import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Trash2, Download, FileText, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { parseCampaignCsv } from '@/utils/campaignCsvParser';
import { parseLeadsCsv } from '@/utils/leadsCsvParser';
import { parseHybridCsv } from '@/utils/hybridCsvParser';
import { detectCsvType, parseCsvHeaders } from '@/utils/csvDetector';
import { useProfileFilter } from '@/contexts/ProfileFilterContext';
import DataImportPreview, { FilePreviewData } from '@/components/DataImportPreview';
import { useCampaignData } from '@/hooks/useCampaignData';
import { DeleteDataSection } from '@/components/DeleteDataSection';
import { ProfileCrud } from '@/components/ProfileCrud';
import { PMConfiguration } from '@/components/PMConfiguration';
import { CsvFormatPreview } from '@/components/CsvFormatPreview';

interface ProcessingProgress {
  currentFile: number;
  totalFiles: number;
  currentFileName: string;
  currentStep: string;
  processedItems: {
    profiles: number;
    campaigns: number;
    metrics: number;
    leads: number;
  };
}

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
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<FilePreviewData[]>([]);
  const [parsedFilesData, setParsedFilesData] = useState<any[]>([]);
  const [profileSelections, setProfileSelections] = useState<Record<string, string>>({});
  const [existingCampaigns, setExistingCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [campaignSelections, setCampaignSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    loadFiles();
    loadExistingCampaigns();
  }, []);

  const loadExistingCampaigns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setExistingCampaigns(data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

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
        const validTypes = ['text/csv'];
        
        if (!validTypes.includes(file.type) && !file.name.match(/\.csv$/i)) {
          toast.error(`Arquivo ${file.name} não é um CSV válido`);
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
              
              // Build campaign-profile mappings
              const campaignProfileMap = new Map<string, Set<string>>();
              parsedData.forEach(d => {
                if (!campaignProfileMap.has(d.campaignName)) {
                  campaignProfileMap.set(d.campaignName, new Set());
                }
                campaignProfileMap.get(d.campaignName)!.add(d.profileName);
              });
              
              const campaignProfileMappings = Array.from(campaignProfileMap.entries()).map(([campaignName, profiles]) => {
                const profilesArray = Array.from(profiles);
                return {
                  campaignName,
                  profiles: profilesArray,
                  selectedProfile: profilesArray.length === 1 ? profilesArray[0] : undefined,
                };
              });
              
              // Auto-select single profile options
              campaignProfileMappings.forEach(mapping => {
                if (mapping.selectedProfile) {
                  setProfileSelections(prev => ({
                    ...prev,
                    [mapping.campaignName]: mapping.selectedProfile!
                  }));
                }
              });
              
              previews.push({
                fileName: fileRecord.file_name,
                campaignsCount: campaignNames.length,
                metricsCount: parsedData.reduce((sum, d) => sum + d.metrics.length, 0),
                positiveLeadsCount: 0,
                negativeLeadsCount: 0,
                campaignNames,
                campaignProfileMappings,
                detectedType: 'campaign-input',
                selectedType: 'campaign-input',
              });

              parsedDataArray.push({
                fileRecord,
                parsedData,
                user,
                type: 'campaign-input',
                csvText: text, // Save original text for re-parsing if type changes
              });
            } else if (detection.type === 'hybrid') {
              // Process hybrid CSV (leads + campaign metrics combined)
              const campaignName = fileRecord.file_name.replace(/\.(csv|xlsx|xls)$/i, '').replace(/_/g, ' ');
              const parsedData = parseHybridCsv(text, campaignName);
              
              previews.push({
                fileName: fileRecord.file_name,
                campaignsCount: 1,
                metricsCount: parsedData.campaignMetrics.filter(m => 
                  Object.keys(m.dailyData).length > 0
                ).length,
                positiveLeadsCount: parsedData.summary.positiveResponses,
                negativeLeadsCount: parsedData.summary.negativeResponses,
                pendingLeadsCount: parsedData.summary.pendingLeads,
                messagesSent: parsedData.summary.messagesSent,
                campaignNames: [campaignName],
                detectedType: 'hybrid',
                selectedType: 'hybrid',
                acceptanceRate: parsedData.summary.acceptanceRate,
              });

              parsedDataArray.push({
                fileRecord,
                parsedData,
                user,
                type: 'hybrid',
                campaignName,
                csvText: text, // Save original text for re-parsing if type changes
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
                detectedType: 'leads',
                selectedType: 'leads',
              });

              parsedDataArray.push({
                fileRecord,
                parsedData,
                user,
                type: 'leads',
                csvText: text, // Save original text for re-parsing if type changes
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

  const handleDataCleared = async () => {
    await loadFromDatabase();
    await loadProfiles();
  };

  const handleProfileSelect = (campaignName: string, profileName: string) => {
    setProfileSelections(prev => ({
      ...prev,
      [campaignName]: profileName
    }));
    
    // Update preview data with selection
    setPreviewData(prev => prev.map(file => ({
      ...file,
      campaignProfileMappings: file.campaignProfileMappings?.map(mapping => 
        mapping.campaignName === campaignName 
          ? { ...mapping, selectedProfile: profileName }
          : mapping
      )
    })));
  };

  const handleCampaignSelect = (fileName: string, campaignName: string) => {
    setCampaignSelections(prev => ({
      ...prev,
      [fileName]: campaignName
    }));
    
    // Update preview data with selection
    setPreviewData(prev => prev.map(file => 
      file.fileName === fileName 
        ? { ...file, selectedCampaign: campaignName }
        : file
    ));
  };

  const handleTypeSelect = async (fileName: string, newType: 'campaign-input' | 'leads' | 'hybrid') => {
    console.log(`🔄 Mudando tipo de ${fileName} para ${newType}`);
    
    // Find the file data and re-parse with new type
    const fileDataIndex = parsedFilesData.findIndex((f: any) => f.fileRecord.file_name === fileName);
    if (fileDataIndex === -1) return;
    
    const fileData = parsedFilesData[fileDataIndex];
    const csvText = fileData.csvText;
    const fileRecord = fileData.fileRecord;
    const user = fileData.user;
    
    if (!csvText) {
      console.error('CSV text not found for re-parsing');
      return;
    }
    
    try {
      let newParsedData: any;
      let newPreview: any;
      const campaignName = fileRecord.file_name.replace(/\.(csv|xlsx|xls)$/i, '').replace(/_/g, ' ');
      
      if (newType === 'hybrid') {
        newParsedData = parseHybridCsv(csvText, campaignName);
        newPreview = {
          fileName: fileRecord.file_name,
          campaignsCount: 1,
          metricsCount: newParsedData.campaignMetrics.filter((m: any) => 
            Object.keys(m.dailyData).length > 0
          ).length,
          positiveLeadsCount: newParsedData.summary.positiveResponses,
          negativeLeadsCount: newParsedData.summary.negativeResponses,
          pendingLeadsCount: newParsedData.summary.pendingLeads,
          messagesSent: newParsedData.summary.messagesSent,
          campaignNames: [campaignName],
          detectedType: fileData.type,
          selectedType: newType,
          acceptanceRate: newParsedData.summary.acceptanceRate,
        };
      } else if (newType === 'campaign-input') {
        newParsedData = parseCampaignCsv(csvText);
        const profileNames = Array.from(new Set(newParsedData.map((d: any) => d.profileName)));
        const campaignNames = Array.from(new Set(newParsedData.map((d: any) => d.campaignName)));
        
        const campaignProfileMap = new Map<string, Set<string>>();
        newParsedData.forEach((d: any) => {
          if (!campaignProfileMap.has(d.campaignName)) {
            campaignProfileMap.set(d.campaignName, new Set());
          }
          campaignProfileMap.get(d.campaignName)!.add(d.profileName);
        });
        
        const campaignProfileMappings = Array.from(campaignProfileMap.entries()).map(([cName, profiles]) => {
          const profilesArray = Array.from(profiles);
          return {
            campaignName: cName,
            profiles: profilesArray,
            selectedProfile: profilesArray.length === 1 ? profilesArray[0] : undefined,
          };
        });
        
        newPreview = {
          fileName: fileRecord.file_name,
          campaignsCount: campaignNames.length,
          metricsCount: newParsedData.reduce((sum: number, d: any) => sum + d.metrics.length, 0),
          positiveLeadsCount: 0,
          negativeLeadsCount: 0,
          campaignNames,
          campaignProfileMappings,
          detectedType: fileData.type,
          selectedType: newType,
        };
      } else if (newType === 'leads') {
        newParsedData = parseLeadsCsv(csvText, fileRecord.file_name);
        const campaignNames = Array.from(
          new Set([
            ...newParsedData.positiveLeads.map((l: any) => l.campaign),
            ...newParsedData.negativeLeads.map((l: any) => l.campaign)
          ])
        ).filter(Boolean);
        
        newPreview = {
          fileName: fileRecord.file_name,
          campaignsCount: 0,
          metricsCount: 0,
          positiveLeadsCount: newParsedData.positiveLeads.length,
          negativeLeadsCount: newParsedData.negativeLeads.length,
          campaignNames,
          detectedType: fileData.type,
          selectedType: newType,
        };
      }
      
      // Update parsed data array
      const newParsedFilesData = [...parsedFilesData];
      newParsedFilesData[fileDataIndex] = {
        fileRecord,
        parsedData: newParsedData,
        user,
        type: newType,
        campaignName: newType === 'hybrid' ? campaignName : undefined,
        csvText,
      };
      setParsedFilesData(newParsedFilesData);
      
      // Update preview data
      setPreviewData(prev => prev.map(p => 
        p.fileName === fileName ? newPreview : p
      ));
      
      console.log(`✅ Arquivo ${fileName} re-parseado como ${newType}`);
    } catch (error) {
      console.error('Error re-parsing file:', error);
      toast.error(`Erro ao processar arquivo como ${newType}`);
    }
  };

  const confirmImport = async (incrementalMode: boolean = true) => {
    console.log('=== Iniciando importação ===');
    console.log('Arquivos parseados:', parsedFilesData.length);
    console.log('Seleções de perfil:', profileSelections);
    console.log('Modo incremental:', incrementalMode);
    
    setProcessing(true);
    setProgress({
      currentFile: 0,
      totalFiles: parsedFilesData.length,
      currentFileName: '',
      currentStep: 'Iniciando...',
      processedItems: { profiles: 0, campaigns: 0, metrics: 0, leads: 0 }
    });
    
    let totalMetrics = 0;
    let totalProfiles = 0;
    let totalCampaigns = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      // Only clear data if NOT in incremental mode
      if (!incrementalMode) {
        setProgress(prev => prev ? { ...prev, currentStep: 'Limpando dados anteriores...' } : null);
        console.log('🗑️ Limpando dados existentes do usuário:', user.id);
        
        // Delete daily_metrics first (foreign key dependency)
        await supabase.from('daily_metrics').delete().eq('user_id', user.id);
        await supabase.from('campaign_metrics').delete().eq('user_id', user.id);
        await supabase.from('leads').delete().eq('user_id', user.id);
        await supabase.from('campaigns').delete().eq('user_id', user.id);
        await supabase.from('profiles_data').delete().eq('user_id', user.id);
        
        console.log('✅ Todos os dados foram limpos');
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        console.log('➕ Modo incremental - adicionando aos dados existentes');
      }

      // Process each file based on type
      let totalLeads = 0;
      let fileIndex = 0;
      
      for (const { parsedData, type, fileRecord, campaignName: fileCampaignName } of parsedFilesData) {
        fileIndex++;
        const fileName = fileRecord?.file_name || `Arquivo ${fileIndex}`;
        
        setProgress(prev => prev ? {
          ...prev,
          currentFile: fileIndex,
          currentFileName: fileName,
          currentStep: `Processando arquivo ${fileIndex}/${parsedFilesData.length}...`
        } : null);
        
        if (type === 'campaign-input') {
          // Filter parsed data based on selected profiles
          const filteredData = parsedData.filter((data: any) => {
            const selectedProfile = profileSelections[data.campaignName];
            return selectedProfile === data.profileName;
          });
          
          console.log(`📊 Processando ${filteredData.length} campaign-profile combinations (filtrado de ${parsedData.length})`);

          for (const data of filteredData) {
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
            setProgress(prev => prev ? {
              ...prev,
              currentStep: `Processando perfil: ${data.profileName}`,
              processedItems: { ...prev.processedItems, profiles: totalProfiles }
            } : null);
            console.log(`✅ Profile: ${data.profileName}`);

            // Create campaign (upsert to avoid duplicate key errors)
            const { data: campaign, error: campaignError } = await supabase
              .from('campaigns')
              .upsert({
                user_id: user.id,
                profile_id: profile.id,
                name: data.campaignName,
                profile_name: data.profileName,
              }, {
                onConflict: 'user_id,name',
                ignoreDuplicates: false,
              })
              .select()
              .single();

            if (campaignError) {
              console.error('❌ Error upserting campaign:', campaignError);
              continue;
            }

            totalCampaigns++;
            setProgress(prev => prev ? {
              ...prev,
              currentStep: `Processando campanha: ${data.campaignName}`,
              processedItems: { ...prev.processedItems, campaigns: totalCampaigns }
            } : null);
            console.log(`✅ Campaign: ${data.campaignName}`);

            // Insert metrics (upsert to avoid duplicate key errors)
            for (const metric of data.metrics) {
              // Upsert campaign_metric without daily_data (will be stored in daily_metrics table)
              const { data: upsertedMetric, error: metricError } = await supabase
                .from('campaign_metrics')
                .upsert({
                  user_id: user.id,
                  campaign_name: data.campaignName,
                  profile_name: data.profileName,
                  event_type: metric.eventType,
                  total_count: metric.totalCount,
                  daily_data: {}, // Empty - daily data goes to daily_metrics table
                }, {
                  onConflict: 'user_id,campaign_name,event_type,profile_name',
                  ignoreDuplicates: false,
                })
                .select()
                .single();

              if (metricError) {
                console.error(`❌ Error upserting metric ${metric.eventType}:`, metricError);
              } else {
                totalMetrics++;
                setProgress(prev => prev ? {
                  ...prev,
                  currentStep: `Processando métrica: ${metric.eventType}`,
                  processedItems: { ...prev.processedItems, metrics: totalMetrics }
                } : null);
                console.log(`✅ Metric: ${metric.eventType}`);

                // Upsert daily data into daily_metrics table
                if (upsertedMetric && metric.dailyData) {
                  const dailyEntries = Object.entries(metric.dailyData)
                    .filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date))
                    .map(([date, value]) => ({
                      campaign_metric_id: upsertedMetric.id,
                      user_id: user.id,
                      date,
                      value: Number(value) || 0,
                    }));

                  if (dailyEntries.length > 0) {
                    const { error: dailyError } = await supabase
                      .from('daily_metrics' as any)
                      .upsert(dailyEntries, {
                        onConflict: 'campaign_metric_id,date',
                        ignoreDuplicates: false,
                      });

                    if (dailyError) {
                      console.error(`❌ Error upserting daily metrics:`, dailyError);
                    } else {
                      console.log(`✅ Upserted ${dailyEntries.length} daily entries for ${metric.eventType}`);
                    }
                  }
                }
              }
            }
          }
        } else if (type === 'leads') {
          // Process leads CSV
          // Check if user selected a specific campaign for this file
          const selectedCampaign = campaignSelections[fileName];
          const campaignNameToUse = selectedCampaign || null;
          
          console.log(`👥 Processando leads: ${parsedData.positiveLeads.length} positivos, ${parsedData.negativeLeads.length} negativos`);
          if (campaignNameToUse) {
            console.log(`📋 Usando campanha selecionada: ${campaignNameToUse}`);
          }
          
          // Insert positive leads
          if (parsedData.positiveLeads.length > 0) {
            const leadsToInsert = parsedData.positiveLeads.map(lead => ({
              user_id: user.id,
              campaign: campaignNameToUse || lead.campaign,
              linkedin: lead.linkedin,
              name: lead.name,
              position: lead.position,
              company: lead.company,
              status: lead.status,
              source: lead.source,
              connection_date: lead.connectionDate,
              imported_at: lead.importedAt, // Use Sequence Generated At as imported_at
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
              totalLeads += deduplicatedLeads.length;
              setProgress(prev => prev ? {
                ...prev,
                currentStep: `Importando ${deduplicatedLeads.length} leads positivos...`,
                processedItems: { ...prev.processedItems, leads: totalLeads }
              } : null);
              console.log(`✅ ${deduplicatedLeads.length} positive leads inserted`);
            }
          }
          
          // Insert negative leads
          if (parsedData.negativeLeads.length > 0) {
            const leadsToInsert = parsedData.negativeLeads.map(lead => ({
              user_id: user.id,
              campaign: campaignNameToUse || lead.campaign,
              linkedin: lead.linkedin,
              name: lead.name,
              position: lead.position,
              company: lead.company,
              status: lead.status,
              source: lead.source,
              connection_date: lead.connectionDate,
              imported_at: lead.importedAt, // Use Sequence Generated At as imported_at
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
              totalLeads += deduplicatedLeads.length;
              setProgress(prev => prev ? {
                ...prev,
                currentStep: `Importando ${deduplicatedLeads.length} leads negativos...`,
                processedItems: { ...prev.processedItems, leads: totalLeads }
              } : null);
              console.log(`✅ ${deduplicatedLeads.length} negative leads inserted`);
            }
          }
        } else if (type === 'hybrid') {
          // Process hybrid CSV (leads + campaign metrics combined)
          const { leads, campaignMetrics, summary } = parsedData;
          // Use campaignName from the current file's parsed data, not find() which returns first match
          const fileData = parsedFilesData.find((p: any) => p.parsedData === parsedData);
          const campaignName = fileData?.campaignName || 'Campanha Importada';
          
          console.log(`🔀 Processando formato híbrido para campanha: ${campaignName}`);
          console.log(`👥 ${leads.length} leads, ${campaignMetrics.length} tipos de métricas`);
          console.log('📊 Resumo:', summary);

          // Create a default profile name based on campaign
          const profileName = `Perfil ${campaignName}`;

          // Create profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles_data')
            .upsert({
              user_id: user.id,
              profile_name: profileName,
            }, {
              onConflict: 'user_id,profile_name',
              ignoreDuplicates: false,
            })
            .select()
            .single();

          if (profileError) {
            console.error('❌ Error creating profile for hybrid:', profileError);
          } else {
            totalProfiles++;
            console.log(`✅ Profile (hybrid): ${profileName}`);
          }

          // Create campaign (upsert to avoid duplicate key errors)
          const { data: campaign, error: campaignError } = await supabase
            .from('campaigns')
            .upsert({
              user_id: user.id,
              profile_id: profile?.id,
              name: campaignName,
              profile_name: profileName,
            }, {
              onConflict: 'user_id,name',
              ignoreDuplicates: false,
            })
            .select()
            .single();

          if (campaignError) {
            console.error('❌ Error upserting campaign for hybrid:', campaignError);
          } else {
            totalCampaigns++;
            console.log(`✅ Campaign (hybrid): ${campaignName}`);
          }

          // Upsert campaign metrics
          for (const metric of campaignMetrics) {
            if (Object.keys(metric.dailyData).length === 0) continue;

            const dailyValues = Object.values(metric.dailyData) as number[];
            const totalCount = dailyValues.reduce((a, b) => a + b, 0);

            const { data: upsertedMetric, error: metricError } = await supabase
              .from('campaign_metrics')
              .upsert({
                user_id: user.id,
                campaign_name: campaignName,
                profile_name: profileName,
                event_type: metric.eventType,
                total_count: totalCount,
                daily_data: {},
              }, {
                onConflict: 'user_id,campaign_name,event_type,profile_name',
                ignoreDuplicates: false,
              })
              .select()
              .single();

            if (metricError) {
              console.error(`❌ Error upserting hybrid metric ${metric.eventType}:`, metricError);
            } else {
              totalMetrics++;
              console.log(`✅ Metric (hybrid): ${metric.eventType} = ${totalCount}`);

              // Upsert daily data
              if (upsertedMetric) {
                const dailyEntries = Object.entries(metric.dailyData)
                  .filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date))
                  .map(([date, value]) => ({
                    campaign_metric_id: upsertedMetric.id,
                    user_id: user.id,
                    date,
                    value: Number(value) || 0,
                  }));

                if (dailyEntries.length > 0) {
                  const { error: dailyError } = await supabase
                    .from('daily_metrics' as any)
                    .upsert(dailyEntries, {
                      onConflict: 'campaign_metric_id,date',
                      ignoreDuplicates: false,
                    });

                  if (dailyError) {
                    console.error(`❌ Error upserting hybrid daily metrics:`, dailyError);
                  } else {
                    console.log(`✅ Upserted ${dailyEntries.length} daily entries for ${metric.eventType}`);
                  }
                }
              }
            }
          }

          // Insert leads from hybrid format
          if (leads.length > 0) {
            // Log lead statuses for debugging
            const statusCounts = leads.reduce((acc: any, lead: any) => {
              acc[lead.status] = (acc[lead.status] || 0) + 1;
              return acc;
            }, {});
            console.log('📊 Lead status distribution:', statusCounts);
            
            const leadsToInsert = leads.map((lead: any) => ({
              user_id: user.id,
              campaign: campaignName,
              linkedin: lead.linkedin,
              name: lead.name,
              position: lead.position,
              company: lead.company,
              status: lead.status || 'pending', // Use lead's status from parser
              source: lead.source,
              connection_date: lead.connectionDate,
              imported_at: lead.importedAt, // Use invite send date as imported_at
              positive_response_date: lead.positiveResponseDate,
              negative_response_date: lead.negativeResponseDate,
              follow_up_1_date: lead.followUp1Date,
              follow_up_1_comments: lead.followUp1Comments,
              follow_up_2_date: lead.followUp2Date,
              follow_up_2_comments: lead.followUp2Comments,
              follow_up_3_date: lead.followUp3Date,
              follow_up_3_comments: lead.followUp3Comments,
            }));

            // Deduplicate leads
            const uniqueLeads = leadsToInsert.reduce((acc: Map<string, any>, lead: any) => {
              const key = `${lead.user_id}-${lead.campaign}-${lead.name}`;
              if (!acc.has(key)) {
                acc.set(key, lead);
              }
              return acc;
            }, new Map<string, any>());

            const deduplicatedLeads = Array.from(uniqueLeads.values());
            console.log(`📊 Deduplicated ${leadsToInsert.length} hybrid leads to ${deduplicatedLeads.length} unique leads`);

            const { error: leadsError } = await supabase
              .from('leads')
              .upsert(deduplicatedLeads as any[], {
                onConflict: 'user_id,campaign,name',
                ignoreDuplicates: false
              });

            if (leadsError) {
              console.error('❌ Error inserting hybrid leads:', leadsError);
            } else {
              totalLeads += deduplicatedLeads.length;
              setProgress(prev => prev ? {
                ...prev,
                currentStep: `Importando ${deduplicatedLeads.length} leads...`,
                processedItems: { ...prev.processedItems, leads: totalLeads }
              } : null);
              console.log(`✅ ${deduplicatedLeads.length} hybrid leads inserted`);
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
      setProgress(null);
    }
  };

  const getFileIcon = () => {
    return <FileText className="h-5 w-5 text-primary" />;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Configurações do Usuário</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus arquivos de dados</p>
        </div>
      </div>

      <CsvFormatPreview />

      <Card>
        <CardHeader>
          <CardTitle>Meus Arquivos</CardTitle>
          <CardDescription>
            Faça upload de arquivos CSV e processe-os para popular o banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                id="file-upload"
                type="file"
                accept=".csv"
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

            {/* Progress indicator during processing */}
            {processing && progress && (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="py-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{progress.currentStep}</p>
                        <p className="text-xs text-muted-foreground">
                          Arquivo {progress.currentFile} de {progress.totalFiles}: {progress.currentFileName}
                        </p>
                      </div>
                    </div>
                    
                    <Progress 
                      value={(progress.currentFile / progress.totalFiles) * 100} 
                      className="h-2"
                    />
                    
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-background rounded p-2">
                        <p className="font-bold text-primary">{progress.processedItems.profiles}</p>
                        <p className="text-muted-foreground">Perfis</p>
                      </div>
                      <div className="bg-background rounded p-2">
                        <p className="font-bold text-primary">{progress.processedItems.campaigns}</p>
                        <p className="text-muted-foreground">Campanhas</p>
                      </div>
                      <div className="bg-background rounded p-2">
                        <p className="font-bold text-primary">{progress.processedItems.metrics}</p>
                        <p className="text-muted-foreground">Métricas</p>
                      </div>
                      <div className="bg-background rounded p-2">
                        <p className="font-bold text-primary">{progress.processedItems.leads}</p>
                        <p className="text-muted-foreground">Leads</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando arquivos...
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p>Nenhum arquivo enviado ainda</p>
                <p className="text-sm mt-1">Faça upload de seus arquivos CSV</p>
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
                        <TableCell>{getFileIcon()}</TableCell>
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

      {/* PM Configuration */}
      <PMConfiguration />

      {/* Profile Management */}
      <ProfileCrud onProfilesChange={loadProfiles} />

      {/* Delete Data Section */}
      <DeleteDataSection onDataCleared={handleDataCleared} />

      <DataImportPreview
        open={showPreview}
        onOpenChange={setShowPreview}
        previewData={previewData}
        onConfirm={confirmImport}
        onCancel={() => {
          setShowPreview(false);
          setParsedFilesData([]);
          setPreviewData([]);
          setProfileSelections({});
          setCampaignSelections({});
        }}
        onProfileSelect={handleProfileSelect}
        onTypeSelect={handleTypeSelect}
        onCampaignSelect={handleCampaignSelect}
        existingCampaigns={existingCampaigns}
        loading={processing}
      />
    </div>
  );
}
