import { useState } from 'react';
import { ParsedFile, MergeType, performLeftJoin, concatenateFiles, convertToKontaxInputFormat, convertToKontaxLeadsFormat } from '@/utils/dataProcessing';
import { FileUpload } from '@/components/FileUpload';
import { DataPreview } from '@/components/DataPreview';
import { MergeConfiguration } from '@/components/MergeConfiguration';
import { MergePreview } from '@/components/MergePreview';
import { ExportOptions } from '@/components/ExportOptions';
import { Button } from '@/components/ui/button';
import { Merge as MergeIcon, ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Step = 'upload' | 'configure' | 'preview' | 'export';

const MergePage = () => {
  const [step, setStep] = useState<Step>('upload');
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [mainFileIndex, setMainFileIndex] = useState(0);
  const [mergeType, setMergeType] = useState<MergeType>('lead-name');
  const [concatenateMode, setConcatenateMode] = useState(false);
  const [mergedData, setMergedData] = useState<Record<string, any>[]>([]);

  const handleFilesProcessed = (processedFiles: ParsedFile[]) => {
    setFiles(processedFiles);
    if (processedFiles.length >= 2) {
      setStep('configure');
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    if (mainFileIndex >= newFiles.length) {
      setMainFileIndex(Math.max(0, newFiles.length - 1));
    }
  };

  const handleClearFiles = () => {
    setFiles([]);
    setMergedData([]);
    setStep('upload');
    setMainFileIndex(0);
  };

  const handlePreviewMerge = () => {
    if (files.length < 2 && !concatenateMode) {
      toast.error('É necessário pelo menos 2 arquivos para realizar o merge');
      return;
    }

    if (files.length < 1) {
      toast.error('É necessário pelo menos 1 arquivo');
      return;
    }

    try {
      let result: Record<string, any>[];

      if (concatenateMode) {
        // Concatenate all files
        result = concatenateFiles(files);
      } else {
        // Perform LEFT JOIN
        const mainFile = files[mainFileIndex];
        const secondaryFiles = files.filter((_, index) => index !== mainFileIndex);
        result = performLeftJoin(mainFile, secondaryFiles, mergeType);
      }

      // Apply format conversion if selected
      if (mergeType === 'kontax-input') {
        result = convertToKontaxInputFormat(result, files);
      } else if (mergeType === 'kontax-leads') {
        result = convertToKontaxLeadsFormat(result, files);
      }

      setMergedData(result);
      setStep('preview');
      toast.success('Preview do merge gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar preview do merge');
      console.error(error);
    }
  };

  const handleConfirmMerge = () => {
    setStep('export');
    toast.success('Merge confirmado! Pronto para download.');
  };

  const handleReset = () => {
    setStep('upload');
    setFiles([]);
    setMergedData([]);
    setMainFileIndex(0);
    setMergeType('lead-name');
    setConcatenateMode(false);
  };

  const getTotalRows = () => {
    return files.reduce((sum, f) => sum + f.rowCount, 0);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Merge de Dados
        </h1>
        <p className="text-muted-foreground">
          Unifique seus dados de leads e empresas com inteligência
        </p>
      </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-between max-w-2xl mx-auto">
          {['Upload', 'Configurar', 'Preview', 'Exportar'].map((label, index) => {
            const stepNames: Step[] = ['upload', 'configure', 'preview', 'export'];
            const currentIndex = stepNames.indexOf(step);
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;

            return (
              <div key={label} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-success text-success-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="text-xs mt-2 text-muted-foreground">{label}</span>
                </div>
                {index < 3 && (
                  <div
                    className={`h-1 flex-1 mx-2 rounded transition-colors ${
                      isCompleted ? 'bg-success' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

      {/* Content */}
      <div className="space-y-6">
          {step === 'upload' && (
            <div className="space-y-4">
              <FileUpload onFilesProcessed={handleFilesProcessed} />
              
              {files.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {files.length} arquivo(s) carregado(s) • Total: {getTotalRows()} linhas
                  </span>
                  <Button variant="outline" size="sm" onClick={handleClearFiles}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpar Todos
                  </Button>
                </div>
              )}

              {files.length >= 2 && (
                <div className="flex justify-end">
                  <Button onClick={() => setStep('configure')} size="lg">
                    Próximo: Configurar
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 'configure' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MergeConfiguration
                  files={files}
                  mainFileIndex={mainFileIndex}
                  mergeType={mergeType}
                  concatenateMode={concatenateMode}
                  onMainFileChange={setMainFileIndex}
                  onMergeTypeChange={setMergeType}
                  onConcatenateModeChange={setConcatenateMode}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-foreground">
                    Preview dos Arquivos
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {files.length} arquivo(s)
                  </span>
                </div>
                {files.map((file, index) => (
                  <div key={index} className="relative">
                    <DataPreview file={file} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-4 right-4"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 justify-end">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={handlePreviewMerge} size="lg">
                  <MergeIcon className="mr-2 h-5 w-5" />
                  Gerar Preview do Merge
                </Button>
              </div>
            </>
          )}

          {step === 'preview' && (
            <>
              <MergePreview
                mergedData={mergedData}
                originalRowCount={concatenateMode ? getTotalRows() : files[mainFileIndex]?.rowCount || 0}
              />

              <div className="flex gap-4 justify-end">
                <Button variant="outline" onClick={() => setStep('configure')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Ajustar Configuração
                </Button>
                <Button onClick={handleConfirmMerge} size="lg">
                  Confirmar Merge
                </Button>
              </div>
            </>
          )}

          {step === 'export' && (
            <>
              <MergePreview
                mergedData={mergedData}
                originalRowCount={concatenateMode ? getTotalRows() : files[mainFileIndex]?.rowCount || 0}
              />

              <ExportOptions data={mergedData} filename="merged-data" />

              <div className="flex justify-center">
                <Button variant="outline" onClick={handleReset}>
                  Novo Merge
                </Button>
              </div>
            </>
          )}
      </div>
    </div>
  );
};

export default MergePage;
