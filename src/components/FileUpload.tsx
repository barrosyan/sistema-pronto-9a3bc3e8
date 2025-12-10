import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export interface ParsedFile {
  name: string;
  headers: string[];
  data: any;
  rowCount: number;
  type: 'csv' | 'excel';
  rawContent?: string; // For CSV files
}

interface FileUploadProps {
  onFilesProcessed: (files: ParsedFile[]) => void;
}

export function FileUpload({ onFilesProcessed }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<ParsedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = async (file: File): Promise<ParsedFile> => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      // Read CSV as text for campaign CSV processing
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines.length > 0 ? lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '')) : [];
      
      // Parse CSV data into rows
      const dataRows: Record<string, any>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, any> = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        dataRows.push(row);
      }
      
      return {
        name: file.name,
        headers,
        data: dataRows,
        rowCount: dataRows.length,
        type: 'csv',
        rawContent: text,
      };
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            const headers = jsonData.length > 0 ? Object.keys(jsonData[0] as object) : [];

            resolve({
              name: file.name,
              headers,
              data: jsonData as Record<string, any>[],
              rowCount: jsonData.length,
              type: 'excel',
            });
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
      });
    } else {
      throw new Error('Formato não suportado. Use CSV ou Excel.');
    }
  };

  const handleFiles = async (files: FileList) => {
    setIsProcessing(true);
    try {
      const fileArray = Array.from(files);
      const processed = await Promise.all(fileArray.map(processFile));
      // Append to existing files instead of replacing
      const newFiles = [...uploadedFiles, ...processed];
      setUploadedFiles(newFiles);
      onFilesProcessed(newFiles);
    } catch (error) {
      console.error('Erro ao processar arquivos:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onFilesProcessed(newFiles);
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          accept=".csv,.xlsx,.xls"
          onChange={handleFileInput}
          className="hidden"
          disabled={isProcessing}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">
            {isProcessing ? 'Processando arquivos...' : 'Arraste arquivos aqui ou clique para selecionar'}
          </p>
          <p className="text-sm text-muted-foreground">
            Suporta CSV e Excel (.xlsx, .xls) - Múltiplos arquivos permitidos
          </p>
        </label>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">Arquivos Carregados:</h3>
          {uploadedFiles.map((file, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {file.rowCount} linhas • {file.headers.length} colunas
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
