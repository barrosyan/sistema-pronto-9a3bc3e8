import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Search, Filter, Users, Edit, Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Lead } from '@/types/campaign';
import { useCampaignData } from '@/hooks/useCampaignData';
import { parseExcelSheets } from '@/utils/excelSheetParser';
import { LeadEditDialog } from '@/components/LeadEditDialog';
import { ManualLeadDialog } from '@/components/ManualLeadDialog';

const ITEMS_PER_PAGE = 20;

type SortField = 'name' | 'position' | 'company' | 'campaign' | 'status' | 'connectionDate';
type SortOrder = 'asc' | 'desc';

const Leads = () => {
  const { positiveLeads, negativeLeads, setPositiveLeads, setNegativeLeads, updateLead, addPositiveLead } = useCampaignData();
  const allLeads = [...positiveLeads, ...negativeLeads];
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [inputData, setInputData] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

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

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setIsDialogOpen(true);
  };

  const handleSaveLead = async (updatedLead: Lead) => {
    if (updatedLead.id) {
      await updateLead(updatedLead.id, updatedLead);
    }
  };

  const handleSaveManualLead = async (leadData: Partial<Lead>) => {
    const newLead: Lead = {
      id: `manual-${Date.now()}`,
      campaign: leadData.campaign || '',
      linkedin: leadData.linkedin || '',
      name: leadData.name || '',
      position: leadData.position || '',
      company: leadData.company || '',
      status: leadData.status || 'pending',
      source: leadData.source || 'Manual',
      ...leadData
    };
    
    await addPositiveLead(newLead);
    toast.success('Lead adicionado com sucesso!');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 inline" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1 inline" />
      : <ArrowDown className="h-4 w-4 ml-1 inline" />;
  };

  const filteredLeads = allLeads
    .filter(lead => 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.campaign.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';
      
      if (sortField === 'connectionDate') {
        aValue = a.connectionDate ? new Date(a.connectionDate).getTime().toString() : '0';
        bValue = b.connectionDate ? new Date(b.connectionDate).getTime().toString() : '0';
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
        <div className="flex gap-2">
          <Button onClick={() => setIsManualDialogOpen(true)} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Lead
          </Button>
          <Button onClick={() => document.getElementById('leads-upload')?.click()} disabled={isLoading}>
            <Upload className="mr-2 h-4 w-4" />
            {isLoading ? 'Processando...' : 'Importar Leads'}
          </Button>
        </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Dados Adicionais de Leads</CardTitle>
          <CardDescription>
            Cole aqui dados de leads para processar junto com o upload de arquivos (opcional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Cole aqui dados de leads adicionais, observações ou informações complementares..."
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
          {inputData && (
            <p className="text-sm text-muted-foreground mt-2">
              {inputData.split('\n').length} linhas de dados inseridas
            </p>
          )}
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
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Lista de Leads</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1}-{Math.min(endIndex, filteredLeads.length)} de {filteredLeads.length} leads
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('name')}
                    >
                      Nome {getSortIcon('name')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('position')}
                    >
                      Cargo {getSortIcon('position')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('company')}
                    >
                      Empresa {getSortIcon('company')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('campaign')}
                    >
                      Campanha {getSortIcon('campaign')}
                    </TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('status')}
                    >
                      Status {getSortIcon('status')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('connectionDate')}
                    >
                      Data Conexão {getSortIcon('connectionDate')}
                    </TableHead>
                    <TableHead>LinkedIn</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>{lead.position}</TableCell>
                      <TableCell>{lead.company}</TableCell>
                      <TableCell>{lead.campaign}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {lead.source || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(lead.status)}</TableCell>
                      <TableCell>
                        {lead.connectionDate 
                          ? new Date(lead.connectionDate).toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
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
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditLead(lead)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <PaginationItem key={page}>
                        <span className="px-4">...</span>
                      </PaginationItem>
                    );
                  }
                  return null;
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
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

      <LeadEditDialog
        lead={editingLead}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveLead}
      />

      <ManualLeadDialog
        open={isManualDialogOpen}
        onOpenChange={setIsManualDialogOpen}
        onSave={handleSaveManualLead}
      />
    </div>
  );
};

export default Leads;
