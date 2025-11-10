import { ParsedFile, MergeType } from '@/utils/dataProcessing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MergeConfigurationProps {
  files: ParsedFile[];
  mainFileIndex: number;
  mergeType: MergeType;
  onMainFileChange: (index: number) => void;
  onMergeTypeChange: (type: MergeType) => void;
}

export function MergeConfiguration({
  files,
  mainFileIndex,
  mergeType,
  onMainFileChange,
  onMergeTypeChange,
}: MergeConfigurationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração do Merge</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Arquivo Principal</Label>
          <Select
            value={mainFileIndex.toString()}
            onValueChange={(value) => onMainFileChange(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {files.map((file, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {file.name} ({file.rowCount} linhas)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            O arquivo principal será usado como base para o LEFT JOIN
          </p>
        </div>

        <div className="space-y-3">
          <Label>Tipo de Merge</Label>
          <RadioGroup value={mergeType} onValueChange={(value) => onMergeTypeChange(value as MergeType)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="lead-name" id="lead-name" />
              <Label htmlFor="lead-name" className="font-normal cursor-pointer">
                Nome do Lead
                <span className="block text-sm text-muted-foreground">
                  Busca por Nome, Lead, Lead Name, First Name, Last Name, Full Name, etc.
                </span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="company-name" id="company-name" />
              <Label htmlFor="company-name" className="font-normal cursor-pointer">
                Nome da Empresa
                <span className="block text-sm text-muted-foreground">
                  Busca por Company, Empresa, Enterprise, etc.
                </span>
              </Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}
