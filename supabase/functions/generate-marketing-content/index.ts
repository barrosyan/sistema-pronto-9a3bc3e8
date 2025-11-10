import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { platform, audience, topic, tone, references, campaignData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating marketing content for:", { platform, audience, topic, tone, references });

    const systemPrompt = `Você é um especialista em marketing digital e copywriting. 
Sua tarefa é criar conteúdo de marketing profissional, persuasivo e adequado para diferentes plataformas.
Considere sempre o público-alvo, o tom de voz solicitado e as melhores práticas de cada plataforma.
Gere conteúdo em português brasileiro.`;

    const userPrompt = `Gere um conteúdo de marketing para:

Plataforma: ${platform}
Público-alvo: ${audience}
Tema/Tópico: ${topic}
Tom de voz: ${tone}

${campaignData ? `Dados da campanha: ${JSON.stringify(campaignData, null, 2)}` : ''}
${references ? `\nReferências e materiais de apoio:\n${references}` : ''}

Por favor, crie:
1. Um título/headline atraente
2. O conteúdo principal otimizado para a plataforma
3. Call-to-action (CTA) persuasivo
4. Hashtags relevantes (se aplicável para a plataforma)

${references ? 'Considere as referências fornecidas para criar um conteúdo mais rico e contextualizado.' : ''}

Formate a resposta de forma clara e estruturada.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erro ao comunicar com AI gateway");
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log("Content generated successfully");

    return new Response(
      JSON.stringify({ content: generatedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-marketing-content:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});