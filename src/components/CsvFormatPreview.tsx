import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Users } from 'lucide-react';

export function CsvFormatPreview() {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Formatos de CSV Aceitos
        </CardTitle>
        <CardDescription>
          Veja abaixo os modelos de arquivos CSV que o sistema aceita
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="campaigns" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="campaigns">CSV de Campanhas</TabsTrigger>
            <TabsTrigger value="leads">CSV de Leads</TabsTrigger>
          </TabsList>
          
          <TabsContent value="campaigns" className="mt-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Arquivo com métricas diárias de campanhas. Colunas de datas variam conforme o período.
              </p>
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold whitespace-nowrap">Campaign Name</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">Event Type</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">Profile Name</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">Total Count</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap text-primary">2025-01-06</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap text-primary">2025-01-07</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap text-primary">...</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="whitespace-nowrap">Campanha ABC</TableCell>
                      <TableCell className="whitespace-nowrap">Connection Requests Sent</TableCell>
                      <TableCell className="whitespace-nowrap">João Silva</TableCell>
                      <TableCell>150</TableCell>
                      <TableCell>25</TableCell>
                      <TableCell>30</TableCell>
                      <TableCell>...</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="whitespace-nowrap">Campanha ABC</TableCell>
                      <TableCell className="whitespace-nowrap">Connection Requests Accepted</TableCell>
                      <TableCell className="whitespace-nowrap">João Silva</TableCell>
                      <TableCell>45</TableCell>
                      <TableCell>8</TableCell>
                      <TableCell>10</TableCell>
                      <TableCell>...</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Event Types aceitos:</strong></p>
                <p className="pl-2">Profile Visits, Connection Requests Sent, Connection Requests Accepted, Messages Sent, Post Likes, Comments Done, Follow-Ups 1/2/3</p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="leads" className="mt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Arquivo com dados de leads para acompanhamento
              </div>
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold whitespace-nowrap">First Name</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">Last Name</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">Company</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">Title</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">Profile Url</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">Campaign</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Maria</TableCell>
                      <TableCell>Santos</TableCell>
                      <TableCell>Empresa XYZ</TableCell>
                      <TableCell>Gerente</TableCell>
                      <TableCell className="text-xs">linkedin.com/in/...</TableCell>
                      <TableCell>Campanha ABC</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Carlos</TableCell>
                      <TableCell>Oliveira</TableCell>
                      <TableCell>Tech Corp</TableCell>
                      <TableCell>Diretor</TableCell>
                      <TableCell className="text-xs">linkedin.com/in/...</TableCell>
                      <TableCell>Campanha ABC</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Colunas opcionais:</strong></p>
                <p className="pl-2">Sequence Generated At, Phone, Email, Connection Degree, Tags</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}