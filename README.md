# VIVOX · Portfólio & Revisão de Materiais

Aplicação web da VIVOX (marketing médico) para **publicar um portfólio** de materiais e **revisar PDFs** como peça folheável, com **comentários em balão ancorados no ponto da página** (estilo Figma).

**Produção:** https://mockups-vivox.vercel.app

## Retomar o trabalho em outro computador

O contexto do projeto fica versionado neste repositório:

- [`AGENTS.md`](AGENTS.md): instruções permanentes para o agente, incluindo leitura e atualização do contexto a cada tarefa.
- [`CONTEXTO.md`](CONTEXTO.md): estado atual, decisões, limitações e próximos passos.
- [`HISTORICO.md`](HISTORICO.md): registro cronológico das entregas e verificações.

Na primeira utilização em outro computador:

```bash
git clone https://github.com/equipevivox/mockups-vivox.git
cd mockups-vivox
```

Se o repositório já estiver clonado, confira `git status` e, com a árvore limpa e sem divergência, execute `git pull --ff-only` na branch que deseja retomar. A branch principal é `main`; trabalhos em outra branch devem ser retomados nela.

Abra a pasta do projeto no Codex e inicie a tarefa a partir dela. O Codex lê as instruções de `AGENTS.md`, que orientam a leitura dos outros registros ([documentação oficial](https://learn.chatgpt.com/docs/agent-configuration/agents-md)). Também é possível pedir: “Leia AGENTS.md e retome pelo CONTEXTO.md e HISTORICO.md”.

Ao concluir cada tarefa relevante, o agente deve atualizar esses arquivos, criar o commit e enviar ao GitHub. Entrar na conta do GitHub não atualiza uma cópia local nem transfere a conversa inteira: a continuidade depende dos registros publicados e de atualizar o repositório.

---

## Rotas

| Rota | Página | Descrição |
|---|---|---|
| `/` e `/portfolio` | `index.html` | Portfólio público — só materiais com `is_public = true` |
| `/admin` | `admin.html` | Login, envio de PDF, publicar no portfólio, abrir/comentar/excluir |
| `/m/:slug` | `viewer.html` | Visualização do material + comentários |

As rotas limpas vêm de `vercel.json` (`rewrites`).

> ⚠️ **Não usar `cleanUrls: true` no `vercel.json`** — ele anula os `rewrites` e `/portfolio` e `/m/:slug` passam a dar 404.
> ⚠️ Em `viewer.html` os assets **precisam de caminho absoluto** (`/common.js`, `/lib/...`). Com caminho relativo, em `/m/SLUG` eles resolvem para `/m/common.js` → 404 (o erro aparece como `Unexpected token '<'`).

---

## Tipos de material

| Tipo | Regra de upload | Como abre |
|---|---|---|
| **Revista** | Qualquer PDF | Spread de 2 páginas (turn.js `display:double`); 1 página no celular |
| **Mockup** | **Só A4 retrato** (aspect ≈ 1.4142, tolerância 0.03) | 1 página centralizada |
| **Folder** | PDF com **exatamente 2 páginas** (frente e verso) | Tri-fold 3D: cada spread é cortado em 3 painéis; gira arrastando, clique abre/fecha |

O corte do folder usa `background-size: 300% 100%` + `background-position` em `0% / 50% / 100%`.

---

## Comentários (estilo Figma)

- Modo de marcação pelo botão **Comentar** ou pela tecla **`C`**; `Esc` sai.
- Clique no ponto da página cria o pin. A posição é gravada em `x`/`y` (0..1, relativos à página).
- Pin mostra a **inicial de quem comentou** e um contador quando há respostas.
- Thread com **respostas** (`parent_id`) e botão **✓ marcar como entregue** (`resolved`).
- Entregues somem da página; há filtro **Abertos / Entregues** e um switch para exibi-los.
- Botão **Ocultar** esconde todos os marcadores (leitura sem distração).
- O nome é **obrigatório** na primeira vez e fica guardado em `localStorage` (`vivox_author`).
- Até **5 imagens** por comentário.

Os pins ficam **dentro** do elemento da página (`.pg`) ou do painel do folder, por isso acompanham a virada.

---

## Fundo de capas do portfólio

O fundo de `/` e `/portfolio` usa uma galeria em perspectiva 3D, com colunas que se deslocam ao rolar a página. O exemplo de referência em React/Framer Motion foi adaptado para CSS e JavaScript nativos, preservando a arquitetura sem build.

- A imagem é a primeira página (`{slug}/pages/0.jpg`) de cada material publicado (`is_public = true`) com pelo menos uma página.
- Cada material ocupa uma única posição no fundo. Posições sem material ficam transparentes; não há imagens de exemplo, capas repetidas para preencher a tela ou cartões de substituição.
- Um material novo preenche a próxima posição livre. Os filtros de categoria atuam na grade de cartões; o fundo mantém todos os materiais publicados.
- A lista é consultada a cada 30 segundos enquanto a aba está visível, ao voltar à aba e ao recuperar a conexão. Envios, publicações e exclusões no painel notificam outras abas do mesmo navegador para atualizar imediatamente quando visíveis.
- Novos uploads continuam respeitando **Mostrar no portfólio**: enviar um material privado não o coloca no fundo público. Despublicar ou excluir um material remove sua capa na próxima atualização.
- Se uma imagem não carregar, seu espaço permanece vazio e uma consulta posterior tenta carregá-la novamente. Falhas temporárias na consulta preservam o último resultado válido.
- Ao reenviar um PDF com o mesmo nome, a notificação do painel renova a URL da capa nas outras abas desse navegador. Uma nova visita também busca a imagem atual. Abas já abertas em outro computador precisam ser recarregadas para renovar uma capa substituída sem mudança nos dados do material.
- O fundo não recebe cliques nem foco e é ignorado por leitores de tela. Usa quatro colunas no desktop, duas no celular e fica estático com a preferência de movimento reduzido.

## Stack

HTML/CSS/JS puro, sem build.

- **turn.js 4 + jQuery 1.7** (`lib/`) — motor do folheamento
- **PDF.js 3.11.174** — renderiza o PDF em imagens **no envio** (só no admin)
- **supabase-js v2** (CDN) — dados e arquivos
- Fonte Inter · identidade dourado `#CCB691→#876224` sobre escuro `#0F0F0B`

### Arquivos

```
index.html  + portfolio.js   portfólio público
viewer.html + viewer.js      visualização + comentários
admin.html  + admin.js       painel (login, upload, publicação)
common.js                    window.VX: cliente Supabase e helpers
portfolio-background.js     distribuição das capas e movimento do fundo
portfolio-background.css    perspectiva, sobreposição e responsividade do fundo
style.css                    base e identidade
ui.css                       portfólio, balões de comentário e admin
lib/                         jquery 1.7 + turn.min.js
pdf.worker.min.js            worker do PDF.js (precisa ser same-origin)
vercel.json                  rewrites das rotas
```

---

## Backend (Supabase)

Projeto `kthestvyzvbbpnsulned` (região sa-east-1).

**`public.mockups`**

| Campo | Tipo | Observação |
|---|---|---|
| `id` | text (PK) | slug: MAIÚSCULAS, sem acento, espaços → `_` |
| `name` | text | nome do arquivo original |
| `num_pages` | int | |
| `aspect` | float | altura/largura da página |
| `type` | text | `revista` \| `mockup` \| `folder` |
| `is_public` | bool | aparece no portfólio |
| `expires_at` | timestamptz | não usado (sempre null) |

**`public.comments`**

| Campo | Tipo | Observação |
|---|---|---|
| `mockup_id` | text | FK → mockups |
| `page_index` | int | 0-based |
| `x`, `y` | float | posição do pin (0..1); null = comentário sem marcador |
| `author`, `body` | text | |
| `photos` | jsonb | URLs públicas |
| `resolved` | bool | "entregue" |
| `parent_id` | uuid | resposta dentro da thread |

**Storage** — bucket `mockups` (público): páginas em `{slug}/pages/{i}.jpg`, fotos em `{slug}/photos/*`.
Guarda **imagens renderizadas**, nunca o PDF original (evita o limite de tamanho e abre sem re-renderizar).

### Migração (já aplicada em produção)

```sql
alter table public.mockups  add column if not exists is_public  boolean not null default false;
alter table public.comments add column if not exists x          double precision;
alter table public.comments add column if not exists y          double precision;
alter table public.comments add column if not exists resolved   boolean not null default false;
alter table public.comments add column if not exists parent_id  uuid references public.comments(id) on delete cascade;
```

---

## Rodar localmente

Servidor estático na raiz do projeto:

```bash
python -m http.server 8130
```

As rotas limpas (`/portfolio`, `/m/SLUG`) **só existem no Vercel**. Localmente use:
`viewer.html?m=SLUG` — o `viewer.js` aceita tanto o caminho quanto a query.

## Deploy

```bash
vercel deploy . --prod --yes
```

O alias `mockups-vivox.vercel.app` é atualizado automaticamente.

---

## Segurança (estado atual)

- O login do admin é **client-side**: usuário `VIVOX` e o **hash SHA-256** da senha em `admin.js`. É uma trava de conveniência, não segurança real.
- A **RLS do Supabase é permissiva para `anon`** — o slug do material funciona como "token" de acesso. A chave publishable dá acesso de leitura/escrita aos dados.
- O repositório está **público**, conforme consulta à API do GitHub em 2026-09-08. A descrição anterior como privado estava desatualizada. Para segurança de verdade seria preciso Supabase Auth + RLS restrita por usuário; o estado das políticas descrito acima ainda precisa ser revalidado no backend.
