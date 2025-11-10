import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Search, Filter, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Lead } from '@/types/campaign';
import { useCampaignData } from '@/hooks/useCampaignData';
import { parseExcelSheets } from '@/utils/excelSheetParser';

const Leads = () => {
  const { positiveLeads, negativeLeads, setPositiveLeads, setNegativeLeads } = useCampaignData();
  const allLeads = [...positiveLeads, ...negativeLeads];
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    toast.info('Processando lista de leads...');

    try {
      const data = await parseExcelSheets(files[0]);
      setPositiveLeads(data.positiveLeads);
      setNegativeLeads(data.negativeLeads);
      
      toast.success(`Leads importados: ${data.positiveLeads.length} positivos, ${data.negativeLeads.length} negativos`);
    } catch (error) {
      console.error('Error processing leads file:', error);
      toast.error('Erro ao processar arquivo de leads');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: Lead['status']) => {
    switch (status) {
      case 'positive':
        return <Badge className="bg-success text-success-foreground">Positivo</Badge>;
      case 'negative':
        return <Badge variant="destructive">Negativo</Badge>;
      case 'pending':
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const filteredLeads = allLeads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.campaign.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: allLeads.length,
    positive: positiveLeads.length,
    negative: negativeLeads.length,
    pending: allLeads.filter(l => l.status === 'pending').length
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Leads</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe e classifique seus leads de eventos
          </p>
        </div>
        <Button onClick={() => document.getElementById('leads-upload')?.click()} disabled={isLoading}>
          <Upload className="mr-2 h-4 w-4" />
          {isLoading ? 'Processando...' : 'Importar Leads'}
        </Button>
        <input
          id="leads-upload"
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estatísticas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{stats.positive}</div>
              <div className="text-sm text-muted-foreground">Positivos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{stats.negative}</div>
              <div className="text-sm text-muted-foreground">Negativos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">Pendentes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formato de Importação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">Leads Positivos:</p>
            <code className="text-xs block overflow-x-auto">
              Campanha, LinkedIn, Nome, Cargo, Empresa, Data Resposta Positiva, Data Repasse, Status, Comentários, Data FU 1, etc.
            </code>
            
            <p className="text-sm font-medium mt-4 mb-2">Leads Negativos:</p>
            <code className="text-xs block overflow-x-auto">
              Campanha, LinkedIn, Nome, Cargo, Empresa, Data Resposta Negativa, Data Repasse, Status, Observações, Teve FU? Porque?
            </code>
          </div>
        </CardContent>
      </Card>

      {allLeads.length > 0 && (
        <>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, empresa ou campanha..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>LinkedIn</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>{lead.position}</TableCell>
                      <TableCell>{lead.company}</TableCell>
                      <TableCell>{lead.campaign}</TableCell>
                      <TableCell>{getStatusBadge(lead.status)}</TableCell>
                      <TableCell>
                        <a 
                          href={lead.linkedin} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Ver Perfil
                        </a>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {allLeads.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum lead cadastrado
              </h3>
              <p className="text-muted-foreground mb-6">
                Importe uma lista de leads para começar o gerenciamento
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Leads;
