import { ParsedFile, MergeType } from '@/utils/dataProcessing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface MergeConfigurationProps {
  files: ParsedFile[];
  mainFileIndex: number;
  mergeType: MergeType;
  concatenateMode: boolean;
  onMainFileChange: (index: number) => void;
  onMergeTypeChange: (type: MergeType) => void;
  onConcatenateModeChange: (enabled: boolean) => void;
}

export function MergeConfiguration({
  files,
  mainFileIndex,
  mergeType,
  concatenateMode,
  onMainFileChange,
  onMergeTypeChange,
  onConcatenateModeChange,
}: MergeConfigurationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração do Merge</CardTitle>
        <CardDescription>
          Configure como os arquivos serão combinados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label className="text-base">Modo Concatenação</Label>
            <p className="text-sm text-muted-foreground">
              Empilhar todos os arquivos verticalmente (ao invés de LEFT JOIN)
            </p>
          </div>
          <Switch 
            checked={concatenateMode} 
            onCheckedChange={onConcatenateModeChange}
          />
        </div>

        {!concatenateMode && (
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
        )}

        <div className="space-y-3">
          <Label>Tipo de Merge / Formato de Saída</Label>
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
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="kontax-input" id="kontax-input" />
              <Label htmlFor="kontax-input" className="font-normal cursor-pointer">
                Adaptar para Input Kontax
                <span className="block text-sm text-muted-foreground">
                  Converte colunas para o formato padrão de campanhas (Campaign Name, Event Type, Profile Name, Total Count)
                </span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="kontax-leads" id="kontax-leads" />
              <Label htmlFor="kontax-leads" className="font-normal cursor-pointer">
                Adaptar para Leads Kontax
                <span className="block text-sm text-muted-foreground">
                  Converte colunas para o formato padrão de leads (Nome, LinkedIn, Empresa, Cargo, Campanha)
                </span>
              </Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}
