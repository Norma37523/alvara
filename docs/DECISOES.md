# Decisões

- 2026-10-07 — O repositório `Norma37523/alvara` (e não `norma-alvaras`, como cita o escopo) é a base do projeto.
- 2026-10-07 — A view `licenses_with_status` usa `security_invoker` para respeitar RLS na Fase 2 e cai nos cortes 30/60 se `app_settings` estiver vazia (o seed é a tarefa F1-04).
- 2026-10-07 — RLS ligado em todas as tabelas já na migração inicial, sem políticas: só o servidor (service role) acessa até a F2-01.
- 2026-10-07 — `/saude` consulta `app_settings` com service role e não expõe a mensagem de erro do banco.
- 2026-10-07 — A migração 0001 foi aplicada manualmente pelo SQL Editor do Supabase (exceção à regra de só usar migração versionada). As próximas passam pela Supabase CLI ou pela integração com o GitHub.
