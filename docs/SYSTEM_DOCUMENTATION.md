# Sistema Pronto - Documentação Completa

## Visão Geral

O **Sistema Pronto** é uma plataforma de gestão e análise de campanhas de marketing e leads, focada em acompanhamento de métricas de LinkedIn outreach, eventos presenciais e conversão de leads.

---

## Índice

1. [Arquitetura do Sistema](#arquitetura-do-sistema)
2. [Estrutura de Tabelas](#estrutura-de-tabelas)
3. [Relacionamentos](#relacionamentos)
4. [Políticas de Segurança (RLS)](#políticas-de-segurança-rls)
5. [Fluxos de Dados](#fluxos-de-dados)
6. [Tipos de Usuário](#tipos-de-usuário)
7. [Funcionalidades Principais](#funcionalidades-principais)
8. [Tabelas Futuras Planejadas](#tabelas-futuras-planejadas)
9. [Formatos de Importação](#formatos-de-importação)

---

## Arquitetura do Sistema

### Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite
- **Estilização**: Tailwind CSS + shadcn/ui
- **Estado**: Zustand + React Query
- **Backend**: Supabase (Lovable Cloud)
- **Banco de Dados**: PostgreSQL
- **Autenticação**: Supabase Auth
- **Storage**: Supabase Storage

### Estrutura de Diretórios

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (shadcn)
│   └── ...             # Componentes de negócio
├── contexts/           # Contextos React (Auth, Admin, Profile Filter)
├── hooks/              # Custom hooks
├── pages/              # Páginas da aplicação
├── types/              # Definições TypeScript
├── utils/              # Utilitários e parsers
└── integrations/       # Integrações (Supabase)

supabase/
├── functions/          # Edge Functions
└── migrations/         # Migrações do banco
```

---

## Estrutura de Tabelas

### 1. `profiles` (Perfis de Usuário)

Armazena informações dos usuários autenticados.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | UUID | Não | PK, referência a auth.users |
| `email` | TEXT | Sim | Email do usuário |
| `full_name` | TEXT | Sim | Nome completo |
| `avatar_url` | TEXT | Sim | URL do avatar |
| `created_at` | TIMESTAMPTZ | Sim | Data de criação |
| `updated_at` | TIMESTAMPTZ | Sim | Data de atualização |

**Trigger**: `handle_new_user()` - Cria perfil automaticamente ao registrar usuário.

---

### 2. `user_roles` (Papéis de Usuário)

Define permissões e tipos de usuário (admin/PM ou usuário padrão).

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | UUID | Não | PK |
| `user_id` | UUID | Não | FK para auth.users |
| `role` | app_role | Não | Enum: 'admin', 'user' |
| `created_at` | TIMESTAMPTZ | Sim | Data de criação |

**Enum `app_role`**: `('admin', 'user')`

**Índice Único**: `(user_id, role)`

---

### 3. `profiles_data` (Perfis de Campanha)

Armazena os perfis de LinkedIn/campanha extraídos dos CSVs.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | UUID | Não | PK |
| `user_id` | UUID | Não | FK para auth.users |
| `profile_name` | TEXT | Não | Nome do perfil |
| `created_at` | TIMESTAMPTZ | Não | Data de criação |
| `updated_at` | TIMESTAMPTZ | Não | Data de atualização |

---

### 4. `campaigns` (Campanhas)

Armazena informações das campanhas de marketing.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | UUID | Não | PK |
| `user_id` | UUID | Não | FK para auth.users |
| `name` | TEXT | Não | Nome da campanha |
| `profile_id` | UUID | Sim | FK para profiles_data |
| `profile_name` | TEXT | Sim | Nome do perfil (denormalizado) |
| `event_id` | UUID | Sim | FK para events |
| `objective` | TEXT | Sim | Objetivo da campanha |
| `cadence` | TEXT | Sim | Cadência de atividades |
| `job_titles` | TEXT | Sim | Cargos-alvo |
| `company` | TEXT | Sim | Empresa |
| `start_date` | DATE | Sim | Data de início |
| `end_date` | DATE | Sim | Data de término |
| `created_at` | TIMESTAMPTZ | Sim | Data de criação |
| `updated_at` | TIMESTAMPTZ | Sim | Data de atualização |

---

### 5. `campaign_metrics` (Métricas de Campanha)

Armazena métricas agregadas por tipo de evento.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | UUID | Não | PK |
| `user_id` | UUID | Não | FK para auth.users |
| `campaign_name` | TEXT | Não | Nome da campanha |
| `profile_name` | TEXT | Não | Nome do perfil |
| `event_type` | TEXT | Não | Tipo de métrica |
| `total_count` | NUMERIC | Sim | Total agregado |
| `daily_data` | JSONB | Sim | Dados diários (deprecated) |
| `created_at` | TIMESTAMPTZ | Sim | Data de criação |
| `updated_at` | TIMESTAMPTZ | Sim | Data de atualização |

**Tipos de Evento (event_type)**:
- `Connection Requests Sent` - Convites enviados
- `Connection Requests Accepted` - Conexões realizadas
- `Messages Sent` - Mensagens enviadas (soma de Follow-ups)
- `Profile Visits` - Visitas ao perfil
- `Post Likes` - Likes em posts
- `Comments Done` - Comentários realizados
- `Follow-Ups 1/2/3` - Follow-ups individuais

---

### 6. `daily_metrics` (Métricas Diárias)

Armazena dados granulares por dia - **fonte de verdade** para dados temporais.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | UUID | Não | PK |
| `campaign_metric_id` | UUID | Não | FK para campaign_metrics |
| `user_id` | UUID | Não | FK para auth.users |
| `date` | DATE | Não | Data da métrica |
| `value` | NUMERIC | Não | Valor numérico |
| `created_at` | TIMESTAMPTZ | Não | Data de criação |
| `updated_at` | TIMESTAMPTZ | Não | Data de atualização |

---

### 7. `leads` (Leads)

Armazena informações de leads positivos, negativos e pendentes.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | UUID | Não | PK |
| `user_id` | UUID | Não | FK para auth.users |
| `campaign` | TEXT | Não | Nome da campanha |
| `campaign_id` | UUID | Sim | FK para campaigns |
| `name` | TEXT | Não | Nome do lead |
| `linkedin` | TEXT | Sim | URL do LinkedIn |
| `position` | TEXT | Sim | Cargo |
| `company` | TEXT | Sim | Empresa |
| `status` | TEXT | Não | Status do lead |
| `source` | TEXT | Sim | Fonte (Kontax, Evento, etc.) |
| `connection_date` | TIMESTAMPTZ | Sim | Data de conexão |
| `positive_response_date` | TEXT | Sim | Data resposta positiva |
| `negative_response_date` | TEXT | Sim | Data resposta negativa |
| `transfer_date` | TEXT | Sim | Data de repasse |
| `meeting_schedule_date` | TEXT | Sim | Data agendamento reunião |
| `meeting_date` | TEXT | Sim | Data da reunião |
| `proposal_date` | TEXT | Sim | Data da proposta |
| `proposal_value` | NUMERIC | Sim | Valor da proposta |
| `sale_date` | TEXT | Sim | Data da venda |
| `sale_value` | NUMERIC | Sim | Valor da venda |
| `profile` | TEXT | Sim | Perfil do lead |
| `classification` | TEXT | Sim | Classificação |
| `whatsapp` | TEXT | Sim | Número WhatsApp |
| `comments` | TEXT | Sim | Comentários gerais |
| `observations` | TEXT | Sim | Observações |
| `status_details` | TEXT | Sim | Detalhes do status |
| `follow_up_1_date` | TEXT | Sim | Data FU1 |
| `follow_up_1_comments` | TEXT | Sim | Comentários FU1 |
| `follow_up_2_date` | TEXT | Sim | Data FU2 |
| `follow_up_2_comments` | TEXT | Sim | Comentários FU2 |
| `follow_up_3_date` | TEXT | Sim | Data FU3 |
| `follow_up_3_comments` | TEXT | Sim | Comentários FU3 |
| `follow_up_4_date` | TEXT | Sim | Data FU4 |
| `follow_up_4_comments` | TEXT | Sim | Comentários FU4 |
| `had_follow_up` | BOOLEAN | Sim | Teve follow-up? |
| `follow_up_reason` | TEXT | Sim | Razão do follow-up |
| `attended_webinar` | BOOLEAN | Sim | Participou webinar? |
| `stand_day` | TEXT | Sim | Dia do stand |
| `pavilion` | TEXT | Sim | Pavilhão |
| `stand` | TEXT | Sim | Stand |
| `created_at` | TIMESTAMPTZ | Sim | Data de criação |
| `updated_at` | TIMESTAMPTZ | Sim | Data de atualização |

**Status Possíveis**:
- `pending` - Pendente
- `positive` - Positivo
- `negative` - Negativo
- `follow-up` - Em Follow-up
- `retomar-contato` - Retomar Contato
- `em-negociacao` - Em Negociação
- `sem-interesse` - Sem Interesse
- `sem-fit` - Sem Fit

**Fontes Possíveis**:
- `Kontax` - Importado via CSV
- `Evento Presencial` - Lead de evento
- `Indicação` - Indicação
- `Outros` - Outras fontes

---

### 8. `events` (Eventos)

Armazena informações de eventos presenciais.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | UUID | Não | PK |
| `user_id` | UUID | Não | FK para auth.users |
| `name` | TEXT | Não | Nome do evento |
| `description` | TEXT | Sim | Descrição |
| `location` | TEXT | Sim | Local |
| `event_type` | TEXT | Sim | Tipo de evento |
| `start_date` | TIMESTAMPTZ | Sim | Data de início |
| `end_date` | TIMESTAMPTZ | Sim | Data de término |
| `created_at` | TIMESTAMPTZ | Não | Data de criação |
| `updated_at` | TIMESTAMPTZ | Não | Data de atualização |

---

### 9. `file_uploads` (Uploads de Arquivos)

Armazena metadados dos arquivos enviados.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | UUID | Não | PK |
| `user_id` | UUID | Não | FK para auth.users |
| `file_name` | TEXT | Não | Nome original |
| `file_size` | BIGINT | Não | Tamanho em bytes |
| `file_type` | TEXT | Não | MIME type |
| `storage_path` | TEXT | Não | Caminho no storage |
| `uploaded_at` | TIMESTAMPTZ | Não | Data de upload |
| `updated_at` | TIMESTAMPTZ | Não | Data de atualização |

---

## Relacionamentos

### Diagrama de Relacionamentos Atual

```
auth.users
    │
    ├──► profiles (1:1)
    │       └── id = auth.users.id
    │
    ├──► user_roles (1:N)
    │       └── user_id → auth.users.id
    │
    ├──► profiles_data (1:N)
    │       └── user_id → auth.users.id
    │
    ├──► campaigns (1:N)
    │       ├── user_id → auth.users.id
    │       ├── profile_id → profiles_data.id
    │       └── event_id → events.id
    │
    ├──► campaign_metrics (1:N)
    │       └── user_id → auth.users.id
    │
    ├──► daily_metrics (1:N)
    │       ├── user_id → auth.users.id
    │       └── campaign_metric_id → campaign_metrics.id
    │
    ├──► leads (1:N)
    │       ├── user_id → auth.users.id
    │       └── campaign_id → campaigns.id
    │
    ├──► events (1:N)
    │       └── user_id → auth.users.id
    │
    └──► file_uploads (1:N)
            └── user_id → auth.users.id
```

---

## Políticas de Segurança (RLS)

Todas as tabelas possuem Row Level Security (RLS) habilitado.

### Políticas Padrão por Usuário

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| profiles | own (id = uid) | - | own | - |
| user_roles | own + admin | admin | admin | admin |
| profiles_data | own + admin | own | own | own |
| campaigns | own + admin | own | own | own |
| campaign_metrics | own + admin | own | own | own |
| daily_metrics | own + admin | own | own | own |
| leads | own + admin | own | own | own |
| events | own + admin | own | own | own |
| file_uploads | own | own | - | own |

### Função de Verificação de Admin

```sql
CREATE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

---

## Fluxos de Dados

### 1. Importação de Campanhas (CSV)

```
CSV Upload → Parser → Validação → Preview
                                      ↓
                              Seleção de Perfil
                                      ↓
                              Confirmação
                                      ↓
    ┌─────────────────────────────────┼─────────────────────────────────┐
    ↓                                 ↓                                 ↓
profiles_data                   campaigns                      campaign_metrics
                                                                       ↓
                                                               daily_metrics
```

### 2. Importação de Leads (CSV)

```
CSV Upload → Detecção de Tipo → Parser → Validação → Preview
                                                        ↓
                                                  Confirmação
                                                        ↓
                                                     leads
```

### 3. Visualização de Dados (PM/Admin)

```
AdminUserContext
      ↓
selectedUserIds[]
      ↓
Query com filtro IN (selectedUserIds)
      ↓
Dados consolidados de múltiplos usuários
```

---

## Tipos de Usuário

### 1. Usuário Padrão (`user`)

- Visualiza apenas seus próprios dados
- Pode importar arquivos CSV
- Pode gerenciar seus leads e campanhas
- Pode criar/editar perfis

### 2. Usuário PM/Admin (`admin`)

- Visualiza dados de múltiplos usuários
- Pode selecionar quais usuários analisar
- Acesso a visões consolidadas
- Comparação entre usuários

---

## Funcionalidades Principais

### Aba Campanhas
- Pivot Table por Campanha (campanhas como colunas)
- Pivot Table Semanal (semanas como colunas)
- Comparação lado-a-lado
- Filtro por campanha

### Aba Perfil
- Métricas consolidadas
- Visualização semanal/diária
- Comparação entre perfis
- Funil de conversão

### Aba Leads
- Lista com filtros por campanha (checkboxes)
- Busca por nome/empresa/campanha
- Edição de leads
- Adição manual de leads
- Exportação CSV/Excel

### Configurações
- Configuração PM (ativar/desativar)
- Seleção de usuários (para PM)
- Gestão de perfis
- Upload de arquivos
- Deleção de dados

---

## Tabelas Futuras Planejadas

### 1. `lead_campaigns` (Relação N:N - Leads x Campanhas)

Permitirá associar um lead a múltiplas campanhas.

```sql
CREATE TABLE public.lead_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  status TEXT, -- Status específico nesta campanha
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id, campaign_id)
);
```

---

### 2. `teams` (Equipes)

Permitirá organizar usuários em equipes.

```sql
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 3. `team_members` (Membros de Equipe)

Relaciona usuários a equipes.

```sql
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);
```

---

### 4. `campaign_goals` (Metas de Campanha)

Armazenará metas e KPIs por campanha.

```sql
CREATE TABLE public.campaign_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- 'invites', 'connections', 'responses', etc.
  target_value NUMERIC NOT NULL,
  period_type TEXT, -- 'daily', 'weekly', 'monthly', 'total'
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 5. `lead_activities` (Histórico de Atividades do Lead)

Registrará todas as interações com leads.

```sql
CREATE TABLE public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  activity_type TEXT NOT NULL, -- 'status_change', 'note', 'call', 'email', 'meeting'
  description TEXT,
  metadata JSONB,
  occurred_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 6. `notifications` (Notificações)

Sistema de notificações para follow-ups e lembretes.

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'follow_up_reminder', 'meeting_reminder', 'goal_achieved'
  title TEXT NOT NULL,
  message TEXT,
  reference_type TEXT, -- 'lead', 'campaign', 'event'
  reference_id UUID,
  read BOOLEAN DEFAULT false,
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 7. `campaign_templates` (Templates de Campanha)

Permitirá salvar configurações de campanha como template.

```sql
CREATE TABLE public.campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  objective TEXT,
  cadence TEXT,
  job_titles TEXT,
  default_duration_days INTEGER,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 8. `reports` (Relatórios Salvos)

Armazenará configurações de relatórios personalizados.

```sql
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL, -- 'campaign', 'lead', 'team', 'comparison'
  filters JSONB, -- Filtros aplicados
  columns JSONB, -- Colunas selecionadas
  sort_config JSONB,
  is_scheduled BOOLEAN DEFAULT false,
  schedule_config JSONB, -- Cron, destinatários, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Formatos de Importação

### CSV de Campanhas (Kontax Input)

```csv
Campaign Name,Event Type,Profile Name,Total Count,2025-01-06,2025-01-07,...
Campanha ABC,Connection Requests Sent,João Silva,150,25,30,...
Campanha ABC,Connection Requests Accepted,João Silva,45,8,10,...
```

### CSV de Leads

```csv
Campaign Name,First Name,Last Name,Title,Company,Messages Sent: X, Received: Y, Connected: [DATE],...
```

---

## Métricas Calculadas

| Métrica | Fórmula |
|---------|---------|
| Taxa de Aceite | Conexões / Convites × 100 |
| Taxa de Resposta | Respostas Positivas / Conexões × 100 |
| Taxa de Reunião | Reuniões / Respostas Positivas × 100 |
| Taxa de Proposta | Propostas / Reuniões × 100 |
| Taxa de Conversão | Vendas / Propostas × 100 |
| Total de Atividades | Convites + Conexões + Mensagens + Visitas + Likes + Comentários |
| Mensagens Enviadas | Follow-up 1 + Follow-up 2 + Follow-up 3 |

---

## Versionamento

| Versão | Data | Descrição |
|--------|------|-----------|
| 1.0.0 | 2025-01-XX | Versão inicial com tabelas core |
| 1.1.0 | Planejado | Adicionar lead_campaigns (N:N) |
| 1.2.0 | Planejado | Adicionar teams e team_members |
| 1.3.0 | Planejado | Adicionar goals e activities |

---

## Contato e Suporte

Para dúvidas sobre a documentação ou sistema, consulte:
- Documentação Lovable: https://docs.lovable.dev/
- Comunidade Discord: https://discord.com/channels/1119885301872070706
