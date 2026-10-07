# Progresso

## Fase 0 — Fundação

| ID | Tarefa | Situação |
|---|---|---|
| F0-01 | Next.js + TypeScript + Tailwind, pnpm, ESLint, Prettier, tsconfig estrito | Concluída |
| F0-02 | Vitest e Playwright com um teste de exemplo cada | Concluída |
| F0-03 | Migração `0001_init.sql` | Concluída: aplicada no Supabase em 2026-10-07 (10 tabelas e a view conferidas) |
| F0-04 | `.env.example`, `PROGRESSO.md`, `DECISOES.md` | Concluída |
| F0-05 | Deploy na Vercel | Concluída: https://alvara-lemon.vercel.app (domínio provisório), `/saude` com banco OK |
| F0-06 | CI no GitHub Actions | Workflow escrito; roda no primeiro push |
| F0-07 | Página `/saude` | Concluída (confirmada: banco OK) |

**Checkpoint 0:** aprovado pelo dono em 2026-10-07. Pendente de conferência: o CI do GitHub Actions (aba Actions do repositório) ainda não foi verificado.

## Fase 1

| ID | Tarefa | Situação |
|---|---|---|
| F1-01 | `computeStatus` com testes | Concluída (`src/domain/status.ts`) |
| F1-21 | `alertsDue` com testes | Concluída (`src/domain/alerts.ts`) |
| F1-03 | Importação da planilha | Concluída: 33 licenças, 12 empresas, 17 unidades gravadas; 2ª execução não altera nada |
| F1-02 | View `licenses_with_status` | Conferida: bate com `computeStatus` na fixture |
| F1-05 | Gatilho `license_history` | Conferido: 33 linhas geradas na importação |
| F1-07 | Layout e telas | Bloqueada: falta `reference/gestao_alvaras_prototipo.html` e os logos |
