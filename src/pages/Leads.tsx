import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Search, Filter, Users, Edit, Plus, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
import { LeadDetailDialog } from '@/components/LeadDetailDialog';
import { ExportOptions } from '@/components/ExportOptions';

const ITEMS_PER_PAGE = 20;

type SortField = 'name' | 'position' | 'company' | 'campaign' | 'status' | 'connectionDate';
type SortOrder = 'asc' | 'desc';

const Leads = () => {
  const { positiveLeads, negativeLeads, pendingLeads, setPositiveLeads, setNegativeLeads, updateLead, addPositiveLead } = useCampaignData();
  const allLeads = [...positiveLeads, ...negativeLeads, ...pendingLeads];
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [showCampaignFilter, setShowCampaignFilter] = useState(false);

  // Get unique campaign names from leads
  const availableCampaigns = Array.from(new Set(allLeads.map(lead => lead.campaign).filter(Boolean)));

  const handleCampaignToggle = (campaign: string, checked: boolean) => {
    if (checked) {
      setSelectedCampaigns([...selectedCampaigns, campaign]);
    } else {
      setSelectedCampaigns(selectedCampaigns.filter(c => c !== campaign));
    }
    setCurrentPage(1);
  };

  const selectAllCampaigns = () => {
    setSelectedCampaigns(availableCampaigns);
  };

  const clearCampaignSelection = () => {
    setSelectedCampaigns([]);
  };

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
      case 'follow-up':
        return <Badge className="bg-blue-500 text-white">Follow-Up</Badge>;
      case 'retomar-contato':
        return <Badge className="bg-orange-500 text-white">Retomar Contato</Badge>;
      case 'em-negociacao':
        return <Badge className="bg-purple-500 text-white">Em Negociação</Badge>;
      case 'sem-interesse':
        return <Badge className="bg-gray-500 text-white">Sem Interesse</Badge>;
      case 'sem-fit':
        return <Badge className="bg-gray-400 text-white">Sem Fit</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
    .filter(lead => {
      const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.campaign.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCampaign = selectedCampaigns.length === 0 || selectedCampaigns.includes(lead.campaign);
      
      return matchesSearch && matchesCampaign;
    })
    .sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';
      
      if (sortField === 'connectionDate') {
        const aTime = a.connectionDate && !isNaN(new Date(a.connectionDate).getTime()) 
          ? new Date(a.connectionDate).getTime() 
          : 0;
        const bTime = b.connectionDate && !isNaN(new Date(b.connectionDate).getTime()) 
          ? new Date(b.connectionDate).getTime() 
          : 0;
        aValue = aTime.toString();
        bValue = bTime.toString();
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
    pending: pendingLeads.length
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
            <Button 
              variant={showCampaignFilter ? "default" : "outline"}
              onClick={() => setShowCampaignFilter(!showCampaignFilter)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filtrar Campanhas
              {selectedCampaigns.length > 0 && (
                <Badge variant="secondary" className="ml-2">{selectedCampaigns.length}</Badge>
              )}
            </Button>
          </div>

          {/* Campaign Filter with Checkboxes */}
          {showCampaignFilter && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Filtrar por Campanha</CardTitle>
                    <CardDescription>Selecione as campanhas que deseja visualizar</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllCampaigns}>
                      Selecionar Todas
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearCampaignSelection}>
                      Limpar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {availableCampaigns.map((campaign, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center space-x-2 p-2 rounded-md border transition-colors ${
                        selectedCampaigns.includes(campaign) ? 'border-primary/50 bg-primary/5' : 'border-border'
                      }`}
                    >
                      <Checkbox
                        id={`campaign-filter-${idx}`}
                        checked={selectedCampaigns.includes(campaign)}
                        onCheckedChange={(checked) => handleCampaignToggle(campaign, checked as boolean)}
                      />
                      <Label
                        htmlFor={`campaign-filter-${idx}`}
                        className="text-sm cursor-pointer flex-1 truncate"
                      >
                        {campaign}
                      </Label>
                    </div>
                  ))}
                </div>
                {availableCampaigns.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma campanha encontrada
                  </p>
                )}
              </CardContent>
            </Card>
          )}

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
                          ? (lead.connectionDate && !isNaN(new Date(lead.connectionDate).getTime())
                              ? new Date(lead.connectionDate).toLocaleDateString('pt-BR')
                              : 'Data inválida')
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

          {/* Export Options */}
          <ExportOptions 
            data={filteredLeads.map(lead => ({
              Nome: lead.name,
              Cargo: lead.position || '',
              Empresa: lead.company || '',
              Campanha: lead.campaign,
              Source: lead.source || '',
              Status: lead.status,
              'Data Conexão': lead.connectionDate || '',
              LinkedIn: lead.linkedin || '',
              WhatsApp: lead.whatsapp || '',
              Observações: lead.observations || '',
              'Data Reunião': lead.meetingDate || '',
              'Data Proposta': lead.proposalDate || '',
              'Valor Proposta': lead.proposalValue || 0,
              'Data Venda': lead.saleDate || '',
              'Valor Venda': lead.saleValue || 0,
            }))}
            filename={`leads-${new Date().toISOString().split('T')[0]}`}
          />
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
