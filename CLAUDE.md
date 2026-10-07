# Norma Alvarás — regras de trabalho

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


@AGENTS.md
