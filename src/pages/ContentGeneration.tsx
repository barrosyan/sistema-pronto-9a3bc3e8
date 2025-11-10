import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Image as ImageIcon, Copy, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCampaignData } from '@/hooks/useCampaignData';

const ContentGeneration = () => {
  const { campaignMetrics, getAllLeads } = useCampaignData();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // Form state for content generation
  const [platform, setPlatform] = useState('linkedin');
  const [audience, setAudience] = useState('');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [references, setReferences] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  
  // Form state for image generation
  const [imagePrompt, setImagePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [generatedImage, setGeneratedImage] = useState('');

  const handleGenerateContent = async () => {
    if (!audience || !topic) {
      toast.error('Preencha o público-alvo e o tema');
      return;
    }

    setIsGenerating(true);
    try {
      // Get campaign data to provide context
      const campaignData = {
        totalCampaigns: campaignMetrics.length,
        totalLeads: getAllLeads().length,
        platforms: [...new Set(campaignMetrics.map(m => m.profileName))]
      };

      const { data, error } = await supabase.functions.invoke('generate-marketing-content', {
        body: { platform, audience, topic, tone, references, campaignData }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setGeneratedContent(data.content);
      toast.success('Conteúdo gerado com sucesso!');
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Erro ao gerar conteúdo. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt) {
      toast.error('Descreva a imagem que deseja gerar');
      return;
    }

    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-marketing-image', {
        body: { prompt: imagePrompt, aspectRatio }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setGeneratedImage(data.imageUrl);
      toast.success('Imagem gerada com sucesso!');
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Erro ao gerar imagem. Tente novamente.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success('Conteúdo copiado para a área de transferência!');
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = 'marketing-image.png';
    link.click();
    toast.success('Imagem baixada!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Geração de Conteúdo</h1>
        <p className="text-muted-foreground mt-1">
          Crie conteúdo de marketing profissional e imagens com IA
        </p>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="content">
            <Sparkles className="mr-2 h-4 w-4" />
            Conteúdo de Marketing
          </TabsTrigger>
          <TabsTrigger value="image">
            <ImageIcon className="mr-2 h-4 w-4" />
            Imagens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Form */}
            <Card>
              <CardHeader>
                <CardTitle>Parâmetros do Conteúdo</CardTitle>
                <CardDescription>
                  Configure os detalhes para gerar conteúdo personalizado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="platform">Plataforma</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger id="platform">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                      <SelectItem value="email">E-mail Marketing</SelectItem>
                      <SelectItem value="blog">Blog Post</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audience">Público-Alvo</Label>
                  <Input
                    id="audience"
                    placeholder="Ex: Profissionais de TI, Gestores de Marketing, etc."
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topic">Tema/Tópico</Label>
                  <Textarea
                    id="topic"
                    placeholder="Descreva o tema do conteúdo..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tone">Tom de Voz</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger id="tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Profissional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="enthusiastic">Entusiasmado</SelectItem>
                      <SelectItem value="educational">Educacional</SelectItem>
                      <SelectItem value="inspirational">Inspirador</SelectItem>
                      <SelectItem value="persuasive">Persuasivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="references">Referências para Criação</Label>
                  <Textarea
                    id="references"
                    placeholder="Cole aqui links, textos ou materiais de referência para enriquecer o conteúdo..."
                    value={references}
                    onChange={(e) => setReferences(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Adicione links, exemplos ou informações que devem ser consideradas na criação do conteúdo
                  </p>
                </div>

                <Button 
                  onClick={handleGenerateContent} 
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Gerar Conteúdo
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generated Content */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Conteúdo Gerado</CardTitle>
                  {generatedContent && (
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {generatedContent ? (
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                      {generatedContent}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>O conteúdo gerado aparecerá aqui</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="image" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Generation Form */}
            <Card>
              <CardHeader>
                <CardTitle>Gerar Imagem</CardTitle>
                <CardDescription>
                  Descreva a imagem que deseja criar para seu conteúdo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="imagePrompt">Descrição da Imagem</Label>
                  <Textarea
                    id="imagePrompt"
                    placeholder="Ex: Uma imagem moderna mostrando profissionais colaborando em um escritório tecnológico..."
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aspectRatio">Formato</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger id="aspectRatio">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1:1">Quadrado (1:1) - Instagram Post</SelectItem>
                      <SelectItem value="16:9">Paisagem (16:9) - LinkedIn, Blog</SelectItem>
                      <SelectItem value="9:16">Retrato (9:16) - Stories, Reels</SelectItem>
                      <SelectItem value="4:5">Instagram Feed (4:5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleGenerateImage} 
                  disabled={isGeneratingImage}
                  className="w-full"
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando Imagem...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Gerar Imagem
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generated Image */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Imagem Gerada</CardTitle>
                  {generatedImage && (
                    <Button variant="outline" size="sm" onClick={downloadImage}>
                      <Download className="mr-2 h-4 w-4" />
                      Baixar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {generatedImage ? (
                  <div className="space-y-4">
                    <img 
                      src={generatedImage} 
                      alt="Imagem gerada" 
                      className="w-full rounded-lg shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <ImageIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>A imagem gerada aparecerá aqui</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentGeneration;