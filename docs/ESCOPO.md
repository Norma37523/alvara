# Sistema de Gestão de Alvarás e Licenças — Norma Contábil

Escopo técnico completo para execução no Claude Code. Cobre todas as fases, do zero até o portal do cliente e a expansão.

---

## 0. Como usar este documento

1. Crie um repositório vazio `norma-alvaras`.
2. Copie este arquivo para `docs/ESCOPO.md` e a seção 1 também para `CLAUDE.md` na raiz.
3. Copie para `reference/` os arquivos abaixo (o dono do projeto fornece):
   - `Controle_de_Alvaras_e_Licencas.xlsx` (dados reais para a carga inicial);
   - `gestao_alvaras_prototipo.html` (referência visual e de fluxo, aprovada);
   - logos da Norma (`horizontal-color.png`, `horizontal-color-negative.png`, `mark-color.png`).
4. Execute **uma fase por vez**. Cada fase termina em um **checkpoint**: rode os testes, mostre o resultado e **pare** até o dono do projeto aprovar.
5. Dentro de cada fase, siga a ordem das tarefas (`F1-01`, `F1-02`...). Marque o que concluiu em `docs/PROGRESSO.md`.

---

## 1. Regras de trabalho (copiar para `CLAUDE.md`)

- Idioma da interface, textos de e-mail e documentação: **português do Brasil**. Identificadores de código, tabelas e colunas: **inglês** (`snake_case` no banco, `camelCase` no TypeScript).
- Voz da marca: consultiva, direta, sem emoji, sem jargão vazio. Evite "excelência", "soluções inovadoras" e similares.
- TypeScript estrito. Validação de toda entrada externa com Zod. Nenhum `any` sem comentário justificando.
- Segredos nunca entram no repositório. Use `.env.local` (ignorado pelo git) e mantenha `.env.example` atualizado.
- Toda mudança de banco é uma migração SQL versionada em `supabase/migrations/`. Nunca altere o banco manualmente.
- Toda regra de negócio (status, prazos, alertas) vive em `src/domain/` como **funções puras**, com testes. A data "hoje" é sempre um parâmetro injetável (nunca `new Date()` solto dentro da regra).
- Fuso horário do negócio: `America/Sao_Paulo`. Datas de vencimento são `date` (sem hora). Cálculo de dias usa datas de calendário, não instantes.
- Não faça ações destrutivas (apagar tabela, reescrever histórico git, apagar arquivo do Drive) sem pedir confirmação.
- Antes de cada checkpoint: `pnpm lint && pnpm typecheck && pnpm test` devem passar. Mostre a saída.
- Commits pequenos, no padrão `feat:`, `fix:`, `chore:`, `test:`, `docs:`.
- Se algo neste escopo for ambíguo ou impossível, **pergunte** em vez de inventar. Registre a decisão em `docs/DECISOES.md`.
- Dados de clientes são sensíveis (documentos societários, CNPJ, endereços). Nunca registre conteúdo de documentos em logs.

---

## 2. Objetivo e contexto

A Norma Contábil precisa controlar alvarás de funcionamento e alvarás/licenças do Corpo de Bombeiros (CLCB/AVCB/PPCI) de um grupo de empresas clientes: o que está em dia, quando vence e o que fazer a cada vencimento. Hoje isso está numa planilha Excel sem alertas automáticos, com 33 licenças em 12 empresas.

O sistema deve:

1. Centralizar licenças e seus documentos (PDFs que já estão no Google Drive da Norma).
2. Calcular a situação de cada licença pela data de validade e avisar antes de vencer.
3. Ler PDFs com IA para preencher número, órgão, emissão e validade, sempre com conferência humana.
4. Dar acesso por login: primeiro à equipe Norma (fase 1), depois aos clientes, cada um vendo só a própria empresa (fase 2).
5. Evoluir para fluxo de renovação, WhatsApp e, depois, oferta como serviço de compliance para vários clientes (fases 3 e 4).

**Fora de escopo em todas as fases** (salvo decisão posterior): módulos de treinamentos, auditorias e financeiro vistos em sistemas concorrentes; emissão de alvarás junto a órgãos públicos; integração com sistemas de prefeituras.

---

## 3. Stack e arquitetura

| Camada | Escolha |
|---|---|
| Aplicação | Next.js (App Router) + TypeScript + Tailwind CSS |
| Banco, autenticação e permissões | Supabase (Postgres, Auth com TOTP/MFA, Row Level Security) |
| Hospedagem e tarefas agendadas | Vercel (incluindo Vercel Cron) |
| Documentos | Google Drive (já existente), acessado por **conta de serviço** |
| Leitura de PDF | API da Anthropic (bloco `document` com PDF em base64) |
| E-mail transacional | Brevo (API v3, `POST /v3/smtp/email`) |
| WhatsApp (fase 3) | Z-API ou Twilio, atrás de uma interface própria (`NotificationChannel`) |
| Testes | Vitest (unidade), Playwright (ponta a ponta) |
| Gerenciador de pacotes | pnpm |

**Princípios de arquitetura**

- Os PDFs **ficam no Drive**. O sistema guarda apenas o `drive_file_id` e metadados. Não copie arquivos para outro armazenamento.
- O navegador **nunca** recebe link do Drive nem credencial. Todo download passa por uma rota do servidor que confere login, permissão e registra o acesso.
- O status da licença (vencida, vence em 30 dias etc.) é **calculado**, nunca digitado. O texto livre (por exemplo "Aguardando alteração contratual") fica em campo próprio.
- Cada tabela com dados de cliente tem `company_id` (direto ou por junção) para as políticas de RLS da fase 2. **Desenhe o banco multiempresa desde a fase 1**, mesmo que só a equipe Norma entre.

**Estrutura de pastas**

```
norma-alvaras/
├─ CLAUDE.md
├─ docs/            ESCOPO.md, PROGRESSO.md, DECISOES.md, LGPD.md
├─ reference/       xlsx, protótipo html, logos
├─ supabase/
│  ├─ migrations/
│  └─ seed/
├─ scripts/         import-xlsx.ts, sync-drive.ts
├─ src/
│  ├─ app/          rotas (App Router), páginas e route handlers
│  ├─ components/
│  ├─ domain/       status.ts, alerts.ts, ... (funções puras + testes)
│  ├─ server/       supabase.ts, drive.ts, anthropic.ts, brevo.ts, audit.ts
│  └─ lib/          utilitários de data, formatação, zod
├─ tests/e2e/
├─ vercel.json
└─ .env.example
```

---

## 4. Variáveis de ambiente (`.env.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # somente servidor
GOOGLE_SERVICE_ACCOUNT_JSON=        # JSON da conta de serviço (base64)
DRIVE_ROOT_FOLDER_ID=               # pasta raiz de clientes
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-5-5   # configurável; confirmar o modelo vigente na documentação
BREVO_API_KEY=
MAIL_FROM_EMAIL=alvaras@normacontabil.com
MAIL_FROM_NAME=Norma Contábil
ALERT_DEFAULT_RECIPIENTS=           # e-mails separados por vírgula
CRON_SECRET=                        # exigido pelas rotas de cron
APP_BASE_URL=https://alvaras.normacontabil.com
TZ_BUSINESS=America/Sao_Paulo
```

---

## 5. Regras de negócio

### 5.1 Tipos de licença
`lf` (alvará de localização e funcionamento), `bombeiros` (alvará/CLCB/AVCB/PPCI do Corpo de Bombeiros), `outro` (reserva para expansão).

### 5.2 Modo de validade (`validity_mode`)
- `dated`: tem data de validade.
- `indefinite`: válido por prazo indeterminado (até nova alteração fática ou estrutural).
- `exempt`: dispensado (por exemplo, baixo risco).
- `unknown`: sem data cadastrada e ainda sem classificação.

### 5.3 Status calculado (função pura `computeStatus(license, today, thresholds)`)

| Status | Regra |
|---|---|
| `expired` (Vencida) | `valid_until < today` |
| `due_30` | `0 <= dias <= 30` |
| `due_60` | `31 <= dias <= 60` |
| `valid` (Em dia) | `dias > 60` |
| `no_term` (Sem prazo) | `validity_mode` é `indefinite` ou `exempt` |
| `pending` (Pendente) | `validity_mode = unknown` ou `valid_until` nulo sem classificação |

`dias = valid_until − today` em dias de calendário. Os cortes (30 e 60) ficam na tabela `app_settings` e são lidos pela função. **O status nunca é gravado como coluna**; use uma view (`licenses_with_status`) para consultas.

### 5.4 Situação documental (texto livre, separada do status)
Campo `documentary_status` com valores sugeridos: `Aguardando alteração contratual`, `Aguardando AVCB dos Bombeiros`, `Verificando`. É informativo e **nunca** substitui a data de validade no cálculo.

### 5.5 Sinalizadores nas observações
Observações da planilha que começam com `PENDENTE:`, `URGENTE:` ou `REEMITIR:` viram o campo `flag` (`pending`, `urgent`, `reissue`) e o prefixo é removido do texto de `notes`.

### 5.6 Calendário de alertas (função pura `alertsDue(licenses, today, alreadySent)`)
- Marcos antes do vencimento, em dias: **90, 60, 30, 15, 7, 3, 1, 0**.
- Licença vencida: repete a cada **7 dias** (`dias_vencida % 7 == 0`).
- **Idempotência:** a tabela `alerts_sent` tem chave única `(license_id, kind, reference_date)`. Rodar a rotina duas vezes no mesmo dia não duplica e-mail.
- Resumo semanal: toda **segunda-feira, 8h (America/Sao_Paulo)**, com tudo que vence em até 90 dias e todas as vencidas.
- Envio **agrupado por destinatário** (um e-mail com várias licenças), nunca um e-mail por licença.
- Licenças sem data de validade entram no resumo semanal como "sem data", mas não geram aviso por marco.

### 5.7 Nomes de exibição das empresas (usar na carga inicial)
`GNPTEC Inteligência em Sistemas`, `INP – Instituto Negócios Públicos do Brasil`, `ContabGov – Capacitação em Contabilidade para Governo`, `INFOCO-RH`, `SIX Ocupacional`, `GovTech Tecnologia em Desenvolvimento`, `BE Intelligence Consultoria`, `Coccinelle Blanche`, `S2V Soluções em Vistoria Veicular`, `NP Partners`, `Gelic Tecnologia`, `Vanlink`.
Unidade: o sufixo `(matriz)` ou `(filial …)` do nome vira `units.label`; sem sufixo, o rótulo é `matriz única`.

---

## 6. Modelo de dados (migração inicial)

Entregue como `supabase/migrations/0001_init.sql`. Estrutura esperada (ajuste tipos e índices conforme necessário, mantendo os nomes):

```sql
create type license_type as enum ('lf','bombeiros','outro');
create type validity_mode as enum ('dated','indefinite','exempt','unknown');
create type license_flag as enum ('pending','urgent','reissue');
create type user_role as enum ('norma_admin','norma_staff','client_manager','client_reader');

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  cnpj_root text,
  drive_folder_id text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  label text not null,                       -- 'matriz', 'filial Foz', 'matriz única'
  cnpj text,
  municipality text,
  created_at timestamptz not null default now(),
  unique (company_id, label)
);

create table licenses (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete cascade,
  type license_type not null,
  issuing_body text,
  number text,
  issued_on date,
  valid_until date,
  validity_mode validity_mode not null default 'unknown',
  documentary_status text,
  owner_name text,                           -- responsável interno
  owner_email text,
  notes text,
  flag license_flag,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (validity_mode <> 'dated' or valid_until is not null)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references licenses(id) on delete cascade,
  drive_file_id text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  sha256 text,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  unique (drive_file_id)
);

create table extractions (                   -- sugestões da IA, sempre revisadas
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  model text not null,
  result jsonb not null,                     -- campos sugeridos + confiança
  status text not null default 'pending_review' check (status in ('pending_review','accepted','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role user_role not null,
  company_id uuid references companies(id),  -- obrigatório para papéis de cliente
  active boolean not null default true,
  check (role in ('norma_admin','norma_staff') or company_id is not null)
);

create table app_settings (
  key text primary key,
  value jsonb not null                        -- ex.: due_thresholds {"due_30":30,"due_60":60}, alert_milestones [90,60,30,15,7,3,1,0]
);

create table alerts_sent (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references licenses(id) on delete cascade,
  kind text not null,                         -- 'milestone_90', ..., 'expired_repeat', 'weekly_digest'
  reference_date date not null,
  channel text not null default 'email',
  recipient text not null,
  provider_message_id text,
  created_at timestamptz not null default now(),
  unique (license_id, kind, reference_date, channel, recipient)
);

create table audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid references auth.users(id),
  action text not null,                       -- 'login','document.view','document.download','license.update',...
  entity text,
  entity_id uuid,
  company_id uuid,
  ip inet,
  user_agent text,
  details jsonb
);

create view licenses_with_status as ...;      -- junta licenças, unidades, empresas e calcula dias e status
```

Inclua: gatilho `updated_at`; índices em `licenses(valid_until)`, `licenses(unit_id)`, `documents(license_id)`, `audit_log(company_id, at)`; histórico de alterações de licenças (tabela `license_history` com valores antes/depois) preenchido por gatilho.

---

## 7. Mapeamento da planilha (carga inicial)

Arquivo: `reference/Controle_de_Alvaras_e_Licencas.xlsx`, aba **"Controle de Licenças"**, cabeçalho na linha 4, dados nas linhas **5 a 37** (33 registros).

| Coluna | Conteúdo | Destino |
|---|---|---|
| A | Empresa (com sufixo matriz/filial) | `companies.name` + `units.label` |
| B | CNPJ | `units.cnpj` |
| C | Município | `units.municipality` |
| D | Tipo de licença | `licenses.type` (`bombeiros` se o texto contém "Bombeiros", senão `lf`) |
| E | Órgão | `licenses.issuing_body` |
| F | Nº do documento/protocolo | `licenses.number` |
| G | Data de emissão | `licenses.issued_on` |
| H | Data de validade | `licenses.valid_until` |
| I | Dias para vencer | **ignorar** (calculado; está em branco em linhas com texto manual) |
| J | Status | se é fórmula/rótulo automático (`Vigente`, `Vence em até 30/60 dias`, `Vencido`, `Sem validade informada`): **ignorar**. Se é texto manual: `Válido por prazo indeterminado…` → `validity_mode=indefinite`; `Dispensado…` → `exempt`; `Aguardando…` ou `Verificando` → `documentary_status` |
| K | Responsável | `licenses.owner_name` |
| L | Link do documento | guardar em `details` da importação (não é fonte de verdade; os arquivos vêm do Drive na tarefa F1-12) |
| M | Observações | `licenses.notes` e `flag` (regra 5.5) |

`validity_mode` = `dated` quando H tem data; senão aplicar a regra da coluna J; senão `unknown`.

**Correções a aplicar na importação (registrar em `docs/DECISOES.md`):**
- Remover espaços sobrando nos nomes (por exemplo "VANLINK ").
- NP Partners e Gelic estão com órgão "Prefeitura Municipal" nas linhas de Bombeiros: importar o dado como está e **listar** essas linhas em um relatório de inconsistências para o dono corrigir (não adivinhar).
- A importação deve ser **idempotente**: rodar duas vezes não duplica registros (chave: empresa + unidade + tipo).

**Fixture de teste (data de referência 2026-10-06):** 33 licenças; 12 empresas; 18 sem data de validade (10 `pending`, 8 `no_term`); 15 com data: **1** vencida (INP filial Foz, Bombeiros, 27/08/2025), **1** `due_30` (ContabGov filial Foz, Bombeiros, 13/10/2026), **2** `due_60` (INFOCO-RH matriz, alvará e Bombeiros, 25/11/2026), **11** `valid`.

---

## 8. Design e identidade (Norma Contábil)

- Posicionamento: "inteligência financeira". Sem emoji em telas e e-mails.
- Cores: `ink-900 #101028`, `ink-800 #18193A`, `ink-700 #23254F`, `ink-600 #313468`, `teal-500 #1EE7D6`, `teal-700 #0FA79F`, neutros `#F5F7FA`, `#ECF0F4`, `#DDE2EB`, `#C4CCD9`, `#6B7488`, `#363D4D`. Semânticas: sucesso `#D6F5E8/#0F9D6B`, alerta `#FDF0D4/#C8820E`, perigo `#FBDBE0/#D23B4E`, informação `#D9E7FB/#2563C8`.
- Tipografia: Poppins (títulos) e DM Sans (corpo).
- Barra lateral sempre `ink-900` com logo `horizontal-color-negative`; conteúdo com tema claro e escuro (preferência do sistema e alternador).
- Botões em formato pílula; cartões com raio 12–16 px; tabelas com cabeçalho teal.
- Reproduza o layout, os componentes e os textos do `reference/gestao_alvaras_prototipo.html` (Dashboard, Documentos, Renovações, Notificações, Administração, painel lateral de detalhe).
- Acessibilidade: foco visível, contraste adequado, navegação por teclado, `prefers-reduced-motion` respeitado, responsivo até 360 px.

---

# FASE 0 — Fundação (3 a 4 dias)

**Objetivo:** projeto no ar vazio, com banco, deploy e pipeline funcionando.

| ID | Tarefa |
|---|---|
| F0-01 | Criar projeto Next.js + TypeScript + Tailwind com pnpm; configurar ESLint, Prettier, `tsconfig` estrito |
| F0-02 | Configurar Vitest e Playwright; um teste de exemplo de cada |
| F0-03 | Criar projeto Supabase; configurar Supabase CLI; migração `0001_init.sql` completa (seção 6) |
| F0-04 | Criar `.env.example`, `docs/PROGRESSO.md`, `docs/DECISOES.md` |
| F0-05 | Deploy na Vercel (preview por pull request, produção na `main`); domínio provisório |
| F0-06 | Pipeline CI (GitHub Actions): lint, typecheck, test em todo PR |
| F0-07 | Página `/saude` com verificação de conexão ao banco |

**Checkpoint 0:** URL de produção abrindo; CI verde; migração aplicada; `docs/` preenchido.

---

# FASE 1 — Sistema interno da equipe Norma (2 a 3 semanas)

**Objetivo:** substituir a planilha. Só a equipe Norma entra, mas o banco já nasce multiempresa.

### Bloco A — Domínio e dados (semana 1)

| ID | Tarefa | Critério de aceite |
|---|---|---|
| F1-01 | `src/domain/status.ts`: `computeStatus` conforme 5.3, com data injetável | Testes cobrindo: dia do vencimento (0), 30, 31, 60, 61, vencida há 1 dia, sem data, `indefinite`, `exempt`, virada de ano e ano bissexto |
| F1-02 | View `licenses_with_status` usando os cortes de `app_settings` | Resultado da view bate com `computeStatus` para toda a fixture |
| F1-03 | `scripts/import-xlsx.ts` conforme seção 7, idempotente, com relatório de inconsistências em `reports/import-YYYYMMDD.md` | Fixture de 33/12/18 reproduzida; segunda execução não altera nada |
| F1-04 | Seed de `app_settings` (cortes 30/60, marcos 90/60/30/15/7/3/1/0, repetição de vencidas 7) | Valores lidos pelo domínio |
| F1-05 | Gatilho `license_history` | Alterar uma data gera linha com antes/depois |

### Bloco B — Acesso e telas (semana 1 a 2)

| ID | Tarefa | Critério de aceite |
|---|---|---|
| F1-06 | Login por e-mail e senha (Supabase Auth), **MFA TOTP obrigatório** para `norma_admin` e `norma_staff`; middleware protegendo todas as rotas | Sem sessão, nenhuma rota abre; sem MFA configurado, redireciona para o cadastro do MFA |
| F1-07 | Layout base: barra lateral, filtros de empresa e unidade, tema claro/escuro, logos, tokens da seção 8 | Visual equivalente ao protótipo |
| F1-08 | **Dashboard:** alerta de topo, 4 indicadores, "Próximas renovações" (90 dias) e "Demandas e pendências" | Números da fixture corretos (1 vencida, 1 em até 30, 2 em 31–60, 11 em dia, 18 sem data) |
| F1-09 | **Documentos:** tabela com busca, filtro por tipo e por situação, ordenação por urgência | Filtros combináveis; busca por empresa, número e órgão |
| F1-10 | **Renovações:** agrupamento por prazo (vencidas, até 30, 31–60, 61–90, 91–180, 181–365, mais de 1 ano, sem data) | Conforme protótipo |
| F1-11 | **Painel de detalhe** da licença com edição (permissão `norma_admin`/`norma_staff`): validade, número, órgão, responsável, observações, `documentary_status`, `validity_mode`, `flag`; validação Zod | Edição grava em `license_history` e `audit_log` |

### Bloco C — Drive e documentos (semana 2)

| ID | Tarefa | Critério de aceite |
|---|---|---|
| F1-12 | Conta de serviço do Google (somente leitura no Drive); `src/server/drive.ts` com listagem por pasta e leitura de metadados | Lista os arquivos de uma pasta de teste |
| F1-13 | Mapear `companies.drive_folder_id` (pasta por cliente) e `scripts/sync-drive.ts`: registra arquivos novos em `documents` (nome, tipo, tamanho, SHA-256) | Idempotente por `drive_file_id` |
| F1-14 | Tela para **vincular arquivo a licença** (arquivos órfãos de uma empresa, atribuir a uma licença, marcar `is_current`) | Uma licença pode ter vários arquivos; só um atual |
| F1-15 | Rota `GET /api/documents/[id]/download`: confere sessão e permissão, **faz stream** do arquivo do Drive, grava `audit_log` (`document.download`); visualização inline em `.../view` | O link do Drive nunca aparece no navegador; usuário sem permissão recebe 403 |

### Bloco D — Leitura de PDF por IA (semana 2 a 3)

| ID | Tarefa | Critério de aceite |
|---|---|---|
| F1-16 | `src/server/anthropic.ts`: envia o PDF em base64 (bloco `document`) com prompt de extração e **saída JSON validada por Zod** | Resposta inválida é rejeitada e registrada, nunca gravada |
| F1-17 | Campos extraídos: `type`, `issuing_body`, `number`, `issued_on`, `valid_until`, `holder_name`, `holder_cnpj`, `address`, `confidence` (0 a 1 por campo) e `evidence` (trecho do documento que sustenta cada data) | Datas só são aceitas no formato ISO e dentro de intervalo plausível |
| F1-18 | Tela **"Revisar extração"**: mostra o PDF ao lado dos campos sugeridos; ações aceitar, editar e aceitar, rejeitar | **Nada é gravado em `licenses` sem confirmação humana.** Aceite grava `license_history` e marca `extractions.status` |
| F1-19 | Cache por `sha256` (mesmo arquivo não é lido duas vezes), limite de páginas e de tamanho, tratamento de PDF escaneado, protegido por senha e ilegível (mensagem clara, sem travar) | Arquivo inválido gera erro amigável |
| F1-20 | Lote: "Ler documentos sem data" processa em fila as licenças `pending` com arquivo vinculado, com limite de concorrência e de custo por execução (configurável) | Painel mostra progresso e erros |

Prompt de extração (base para `anthropic.ts`): *"Você lê alvarás de funcionamento e licenças do Corpo de Bombeiros (CLCB, AVCB, PPCI) do Brasil. Extraia apenas o que está escrito no documento. Se um campo não aparecer, retorne `null`. Nunca deduza a validade a partir de regras gerais. Para cada data, informe o trecho do documento que a sustenta. Responda somente com JSON no esquema fornecido."*

### Bloco E — Alertas (semana 3)

| ID | Tarefa | Critério de aceite |
|---|---|---|
| F1-21 | `src/domain/alerts.ts`: `alertsDue` conforme 5.6, função pura | Testes: cada marco, vencida a cada 7 dias, idempotência, licença sem data, virada de mês |
| F1-22 | `src/server/brevo.ts` e modelo de e-mail em português (um e-mail por destinatário, agrupado, com tabela das licenças, link para o sistema) | E-mail renderiza em Gmail e Outlook; texto alternativo em texto puro |
| F1-23 | Rota `POST /api/cron/alerts` (diária, 8h BRT = 11h UTC) e `POST /api/cron/weekly-digest` (segunda 8h BRT), protegidas por `Authorization: Bearer $CRON_SECRET`; agendadas em `vercel.json` | Chamada sem segredo retorna 401; execução dupla não duplica envio |
| F1-24 | Resolução de destinatário: `owner_email` da licença, senão `ALERT_DEFAULT_RECIPIENTS`; sempre com cópia para a lista padrão | Configurável na tela de Administração |
| F1-25 | Tela **Notificações** (avisos de hoje e regras) e botão "Enviar e-mail de teste" | Envio de teste chega ao destinatário |
| F1-26 | Registro em `alerts_sent` e visualização do histórico de envios | Auditável por licença |

### Bloco F — Administração e acabamento

| ID | Tarefa | Critério de aceite |
|---|---|---|
| F1-27 | Tela **Administração** (somente `norma_admin`): usuários da equipe, pastas do Drive por cliente, destinatários dos avisos, cortes de status | Alteração gera `audit_log` |
| F1-28 | Cadastro manual de empresa, unidade e licença; arquivar (não apagar) | Sem exclusão física |
| F1-29 | Exportar para Excel e CSV a lista filtrada de licenças | Colunas iguais às da planilha original |
| F1-30 | Backup: rotina de exportação do banco (Supabase) e instrução de restauração em `docs/OPERACAO.md` | Restauração testada uma vez |
| F1-31 | Domínio definitivo, HTTPS, cabeçalhos de segurança, página de erro, 404 | |
| F1-32 | Testes ponta a ponta (Playwright): login com MFA, filtrar documentos, abrir detalhe, baixar arquivo, aceitar extração, cron de alerta com data simulada | Todos verdes no CI |

**Checkpoint 1 (aceite da fase):**
1. As 33 licenças estão no sistema, com a fixture da seção 7 reproduzida.
2. Cada licença com arquivo no Drive tem o PDF vinculado e baixável.
3. Um e-mail de teste e um alerta real (com data simulada) chegaram ao destinatário certo, agrupados.
4. A INP filial Foz aparece como vencida e destacada no Dashboard.
5. Das 18 licenças sem data, as que têm PDF foram lidas e estão em revisão ou confirmadas.
6. A equipe usa o sistema no lugar da planilha por **2 semanas seguidas**.

---

# FASE 2 — Portal do cliente com login (2 a 3 semanas)

**Objetivo:** cada cliente entra com login e senha e vê **somente a própria empresa**.

### Segurança e acesso

| ID | Tarefa | Critério de aceite |
|---|---|---|
| F2-01 | **Políticas RLS** em todas as tabelas: `norma_*` acessam tudo; `client_*` só linhas da própria `company_id` (direta ou por junção) | Teste automatizado: usuário da empresa A não lê nenhuma linha da empresa B, nem por API direta |
| F2-02 | Papéis de cliente: `client_manager` (vê tudo da empresa, convida leitores, baixa documentos) e `client_reader` (somente consulta, download opcional por empresa) | Matriz de permissões documentada em `docs/PERMISSOES.md` e testada |
| F2-03 | **Convite por e-mail** (Norma convida; link de uso único com validade de 72 horas); definição de senha pelo próprio cliente | Link expirado ou reutilizado é recusado |
| F2-04 | Política de senha, bloqueio após tentativas falhas, limite de requisições (rate limit) em login e download, sessão com expiração por inatividade | Testes de bloqueio |
| F2-05 | **MFA** (TOTP): obrigatório para `client_manager`, recomendado para leitor | Fluxo de cadastro e de recuperação |
| F2-06 | Recuperação de senha por e-mail | |
| F2-07 | Download do cliente passa pela mesma rota da fase 1, com checagem de empresa; **marca d'água ou nome do usuário no registro de acesso** | `audit_log` com usuário, empresa, IP e arquivo |

### Experiência do cliente

| ID | Tarefa | Critério de aceite |
|---|---|---|
| F2-08 | Visão cliente: Dashboard, Documentos, Renovações, Notificações da própria empresa; **sem** observações internas, responsável interno, histórico de alterações ou Administração | Conforme o modo "Visão cliente" do protótipo |
| F2-09 | Filtro por unidade (matriz e filiais) | |
| F2-10 | Avisos por e-mail ao cliente (gestor), com texto próprio e sem dados internos; cliente escolhe receber ou não o resumo semanal | |
| F2-11 | **Envio de renovação pelo cliente:** formulário para anexar o PDF novo; o arquivo vai para a pasta da empresa no Drive e cria uma extração `pending_review` para a equipe Norma conferir | Cliente nunca altera datas diretamente |
| F2-12 | Área da Norma: gerenciar usuários e convites por empresa, ver trilha de acessos por cliente | |
| F2-13 | Aviso de privacidade e termo de uso no primeiro acesso, com registro de aceite (data e versão) | |

### LGPD e conformidade

| ID | Tarefa |
|---|---|
| F2-14 | `docs/LGPD.md`: dados tratados, finalidade, base legal, operadores (Supabase, Vercel, Google, Anthropic, Brevo), prazo de retenção, canal do titular |
| F2-15 | Rotina de exclusão/anonimização de usuário sob solicitação; exportação dos dados do usuário |
| F2-16 | Revisão dos termos dos operadores sobre uso de dados (PDFs enviados à API da Anthropic não podem ser usados para treinamento nas condições contratadas; confirmar e registrar) |
| F2-17 | Teste de invasão básico (checklist OWASP): IDOR em IDs de documento, enumeração de usuários, injeção, cabeçalhos |

### Testes e entrega

| ID | Tarefa |
|---|---|
| F2-18 | Ponta a ponta: convite → senha → MFA → ver só a própria empresa → tentar abrir ID de outra empresa (deve falhar) |
| F2-19 | Piloto com **1 cliente real (sugestão: INP)** por 2 semanas; coletar feedback |

**Checkpoint 2 (aceite da fase):**
1. Testes de RLS provam o isolamento entre empresas.
2. Piloto concluído, com download funcionando e registrado na trilha.
3. `docs/LGPD.md` revisado pelo dono do projeto (e, se possível, por advogado) antes de abrir para mais clientes.

---

# FASE 3 — Fluxo de renovação e WhatsApp (3 a 4 semanas)

**Objetivo:** transformar o alerta em ação acompanhada.

| ID | Tarefa | Critério de aceite |
|---|---|---|
| F3-01 | Tabela `renewal_tasks`: licença, etapa, responsável (Norma ou cliente), prazo, status, comentários, anexos | Migração e RLS |
| F3-02 | Etapas padrão de renovação (configuráveis por tipo): levantar documentos, pagar taxa, protocolar, acompanhar, concluir | Etapas editáveis na Administração |
| F3-03 | Criar tarefa **automaticamente** quando a licença entra na faixa de 90 dias; atribuir ao responsável | Idempotente |
| F3-04 | Tela **Demandas**: quadro por etapa, filtros, comentários, anexos, prazo; visível ao cliente nas tarefas que dependem dele | |
| F3-05 | Interface `NotificationChannel` (e-mail, WhatsApp) e implementação do WhatsApp (Z-API ou Twilio) com **modelos aprovados** e consentimento (opt-in) registrado por contato | Envio só para contatos com opt-in |
| F3-06 | Preferências de aviso por usuário (canais e marcos) | |
| F3-07 | Painel de **SLA interno**: tarefas atrasadas, tempo médio de renovação, licenças vencidas por cliente | |
| F3-08 | Resumo semanal consolidado para a diretoria da Norma (todas as empresas, vencidas e próximas 30 dias) | |
| F3-09 | Calendário: gerar arquivo `.ics` e/ou eventos no Google Calendar de cada vencimento | |

**Checkpoint 3:** uma renovação real conduzida do alerta de 90 dias até a conclusão dentro do sistema, com o cliente participando.

---

# FASE 4 — Escala e oferta como serviço (contínua, após a fase 3)

**Objetivo:** vender o controle de compliance como serviço recorrente da Norma.

| ID | Tarefa |
|---|---|
| F4-01 | Novos tipos de licença (vigilância sanitária, licença ambiental, CNPJ/inscrições, certidões) usando `license_type` e campos configuráveis |
| F4-02 | Importação em lote por planilha para novos clientes (modelo padrão de importação) e assistente de cadastro |
| F4-03 | Relatório mensal em PDF por cliente (situação, vencimentos, ações realizadas), com a identidade da Norma |
| F4-04 | Portal com marca configurável por cliente (white label simples: nome e logo) |
| F4-05 | Plano e cobrança: limites por cliente (número de licenças, usuários), controle de uso da IA e custo por cliente |
| F4-06 | Indicadores comerciais internos: clientes ativos, licenças monitoradas, renovações concluídas, receita recorrente |
| F4-07 | Observabilidade: logs estruturados, alertas de falha das rotinas agendadas (se o cron não rodar, avisar a equipe), monitor de disponibilidade |
| F4-08 | API interna autenticada para integração com outros sistemas da Norma (por exemplo ERP) |
| F4-09 | Avaliação de módulos adicionais (treinamentos, auditorias, financeiro) só se houver demanda comprovada de clientes |

---

## 9. Qualidade, segurança e operação (valem para todas as fases)

**Testes mínimos obrigatórios**
- Domínio (status, alertas, parsing de observações): cobertura alta e casos de borda de data.
- Importação: fixture 33/12/18 e idempotência.
- RLS: matriz papel × tabela × operação.
- Ponta a ponta: fluxos críticos de cada fase.

**Segurança**
- Chave `SUPABASE_SERVICE_ROLE_KEY` e credenciais do Google **somente no servidor**.
- Cabeçalhos de segurança (CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`).
- Validação de tamanho e tipo de arquivo; proteção contra IDOR em todas as rotas por ID.
- Logs sem conteúdo de documentos e sem senhas ou tokens.
- Dependências auditadas (`pnpm audit`) no CI.

**Operação**
- Backup diário do banco e teste de restauração a cada trimestre.
- Monitorar falha das rotinas agendadas e de envio de e-mail.
- `docs/OPERACAO.md`: como rodar importação, sincronizar o Drive, reenviar alertas, rotacionar segredos, restaurar backup.

---

## 10. Riscos conhecidos e decisões que dependem do dono do projeto

| Item | Decisão ou cuidado |
|---|---|
| Qualidade dos PDFs escaneados | Leitura por IA é sugestão, nunca verdade; conferência humana obrigatória |
| Permissões das pastas do Drive variam por cliente | Padronizar a estrutura `Clientes / <Empresa> / Societário / Alvarás` antes da F1-13 |
| 18 licenças sem data | Priorizar o preenchimento antes de depender dos alertas |
| Cadastro com erros (órgão da NP Partners e da Gelic, nome com espaço) | Corrigir pelo relatório da F1-03 |
| WhatsApp exige consentimento e modelos aprovados | Só iniciar a F3-05 com política de opt-in definida |
| LGPD e contratos com operadores | Revisão jurídica antes da abertura aos clientes (F2-14 a F2-16) |
| Modelo da API da Anthropic | Manter em variável de ambiente e conferir o modelo vigente na documentação antes de produção |
| Custo da IA | Cache por hash, limites por execução e relatório de uso (F1-19, F1-20, F4-05) |
| Quem é o responsável por cada licença e recebe os avisos | Preencher `owner_email` (hoje a planilha só tem o nome) |

---

## 11. Resumo de prazos e marcos

| Fase | Duração estimada | Entrega principal |
|---|---|---|
| 0 — Fundação | 3 a 4 dias | Projeto no ar, banco e CI |
| 1 — Interno | 2 a 3 semanas | Substitui a planilha: dados, Drive, leitura de PDF, alertas por e-mail |
| 2 — Portal do cliente | 2 a 3 semanas | Login do cliente, isolamento por empresa, piloto, LGPD |
| 3 — Renovação e WhatsApp | 3 a 4 semanas | Fluxo de renovação acompanhado e avisos por WhatsApp |
| 4 — Escala | contínua | Novos tipos, relatórios, marca por cliente, cobrança |

**Primeiro comando para o Claude Code:** *"Leia `docs/ESCOPO.md` e `CLAUDE.md`. Execute a Fase 0 completa, tarefa por tarefa, atualizando `docs/PROGRESSO.md`. Ao terminar, rode lint, typecheck e testes, mostre o resultado e pare no Checkpoint 0 aguardando minha aprovação."*
