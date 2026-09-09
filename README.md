# VIVOX · Portfólio & Revisão de Materiais

Aplicação web da VIVOX (marketing médico) para **publicar um portfólio** de materiais e **revisar PDFs** como peça folheável, com **comentários em balão ancorados no ponto da página** (estilo Figma).

**Produção:** [grid.vivoxmarketing.com.br](https://grid.vivoxmarketing.com.br) · [alias Vercel](https://mockups-vivox.vercel.app)

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
| `/admin` | `admin.html` | Login, envio de PDF, renomear, publicar no portfólio, abrir/comentar/excluir |
| `/m/:slug` | `viewer.html` | Visualização do material + comentários |

As rotas limpas vêm de `vercel.json` (`rewrites`).

O topo público usa a logo **VIVOX Grid**, centralizada, sem botão de administração. O painel é acessado diretamente por `/admin`.

O botão no canto superior alterna os temas **claro e escuro** da página inicial e do painel, incluindo o login. O padrão é escuro, com preto absoluto; a escolha fica salva no navegador em `localStorage` (`vivox_theme`) e é aplicada antes dos estilos para evitar flashes. O tema claro usa uma versão da mesma logo com letras escuras, mantendo o dourado. O painel usa a mesma base preta ou clara, com superfícies neutras e ações douradas. O visualizador mantém seu tema original.

A logo VIVOX Grid fica centralizada também no topo do painel e do login. Seus quatro quadradinhos têm uma breve animação sutil a cada oito segundos, interrompida fora da tela, em abas ocultas e com movimento reduzido. O SVG original continua como alternativa caso o aprimoramento não carregue. O ícone `V.svg` enviado pelo usuário está preservado em `assets/vivox-icon.svg`; uma versão com enquadramento quadrado, sem alterar o desenho, é o favicon estático das três páginas.

No painel, use **Renomear → Nome exibido → Salvar nome** em cada material para mudar o título que aparece no portfólio e ao abrir o material. O campo aceita até 120 caracteres, remove espaços excedentes e a extensão `.pdf`. A alteração usa `mockups.name`, preserva o slug, os links, as páginas, os comentários e a publicação. Reenviar o PDF com o mesmo nome de arquivo também preserva esse título; arquivos novos começam com o nome do PDF. Falhas ao salvar mantêm o texto digitado para nova tentativa.

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
- Até **5 imagens** por comentário, em JPG, PNG, WebP ou GIF, de até 10 MB cada. Novos anexos vão para o Cloudflare R2.

Os pins ficam **dentro** do elemento da página (`.pg`) ou do painel do folder, por isso acompanham a virada.

---

## Fundo de capas do portfólio

O fundo de `/` e `/portfolio` usa uma galeria em perspectiva 3D, com colunas que se deslocam em sentidos opostos ao rolar. O exemplo de referência em React/Framer Motion foi adaptado para CSS e JavaScript nativos, preservando o frontend nativo, sem bundler. O progresso vem do elemento que realmente rola (documento ou contêiner), de início a fim; a matriz usa os ângulos e a mola da referência, com profundidade ajustada para preservar o zoom solicitado. Não há uma seção vazia de 600vh nem cópias de capas para prolongar o efeito.

O cabeçalho e os filtros ficam centralizados. A lista apresenta capas com largura de até 420px, com até quatro materiais por linha a partir de 1680px, três entre 900px e 1679px, dois entre 600px e 899px e um abaixo de 600px. Linhas incompletas também ficam centralizadas. A base do tema escuro é preto absoluto (`#000000`); o tema claro usa `#faf9f6`, com sobreposições da mesma cor sobre as capas do fundo, que se aproximam ao rolar. O rodapé “ferramenta interna de revisão de materiais” foi removido.

- A imagem é a primeira página de cada material publicado (`is_public = true`) com pelo menos uma página. `VX.materialPageUrl(material, 0)` resolve o provedor correto: R2 nos novos envios, Supabase nos materiais legados.
- Cada material ocupa uma única posição no fundo. Posições sem material ficam transparentes; não há imagens de exemplo, capas repetidas para preencher a tela ou cartões de substituição.
- Um material novo preenche a próxima posição livre. A matriz tem altura independente da quantidade e cada capa tem posição absoluta na coluna; incluir mais materiais não recentraliza as capas anteriores. As próximas imagens entram pela direção de movimento da coluna. Os filtros de categoria atuam na grade de cartões; o fundo mantém todos os materiais publicados.
- A lista é consultada a cada 15 segundos enquanto a aba está visível, ao voltar à aba e ao recuperar a conexão. Envios, publicações, exclusões e mudanças de nome no painel notificam outras abas do mesmo navegador para atualizar imediatamente quando visíveis.
- Novos uploads continuam respeitando **Mostrar no portfólio**: enviar um material privado não o coloca no fundo público. Despublicar ou excluir um material remove sua capa na próxima atualização.
- As imagens decorativas são pré-carregadas sem depender da visibilidade de um elemento transformado. A nova versão substitui a anterior somente ao carregar; se falhar ou ultrapassar 15 segundos, seu espaço fica vazio. A consulta seguinte tenta de novo com outra chave de cache. Respostas atrasadas não podem recolocar uma versão antiga. Falhas temporárias na consulta de materiais preservam o último resultado válido.
- `mockups.cover_version` identifica a versão das páginas no banco. Um trigger renova esse UUID quando o envio atualiza `num_pages` ou `aspect`, mesmo mantendo os valores anteriores. Edições apenas do nome ou da publicação não renovam a imagem. Portfólio, miniaturas do admin e visualizador usam `?cacheNonce=<versão>` nas URLs para renovar o cache do navegador e do Storage. Assim, um reenvio também chega a abas abertas em outros computadores na próxima consulta, sem recarregar a página.
- O fundo não recebe cliques nem foco e é ignorado por leitores de tela. Usa quatro colunas no desktop, duas no celular e fica estático com a preferência de movimento reduzido.

## Stack

Frontend HTML/CSS/JS puro. O empacotamento apenas copia os assets públicos; a API de arquivos roda separadamente na Vercel.

- **turn.js 4 + jQuery 1.7** (`lib/`) — motor do folheamento
- **PDF.js 3.11.174** — renderiza o PDF em imagens **no envio** (só no admin)
- **supabase-js v2** (CDN) — dados e arquivos
- Fonte Inter · identidade dourado `#CCB691→#876224` sobre escuro `#0F0F0B`

### Arquivos

```
index.html  + portfolio.js   portfólio público
viewer.html + viewer.js      visualização + comentários
admin.html  + admin.js       painel (login, upload, nomes, publicação)
theme.js                     preferência claro/escuro compartilhada pelo portfólio e admin
common.js                    window.VX: cliente Supabase e helpers
api/storage.js               função Vercel: entrada da API de arquivos
server/                      autenticação, operações e adaptadores R2/Supabase
scripts/build-static.cjs      copia somente os assets públicos para public/
scripts/dev.cjs               servidor local com API e assets permitidos
portfolio-background.js     distribuição das capas e movimento do fundo
portfolio-background.css    perspectiva, sobreposição e responsividade do fundo
style.css                    base e identidade
ui.css                       portfólio, balões de comentário e admin
assets/identity.css           cores compartilhadas, painel e animação da marca
assets/brand.js               anima os quatro quadrados dos SVGs locais
assets/favicon.svg            V e quadradinhos na guia do navegador
assets/vivox-icon.svg         ícone original fornecido pelo usuário
assets/vivox-grid.svg         logo original no portfólio e no painel
assets/vivox-grid-light.svg   mesma logo com letras escuras para o tema claro
tests/material-name.test.cjs validação de nomes e gravação sem alterar o slug
tests/portfolio-background.test.cjs posições, respostas atrasadas e movimento
supabase/migrations/          migrações desta aplicação, incluindo versão das capas
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
| `name` | text | nome exibido editável; inicialmente recebe o nome do PDF |
| `num_pages` | int | |
| `aspect` | float | altura/largura da página |
| `type` | text | `revista` \| `mockup` \| `folder` |
| `is_public` | bool | aparece no portfólio |
| `cover_version` | uuid | versão de cache das páginas, gerada pelo banco no envio |
| `r2_prefix` | text, nullable | pasta da versão no R2; nulo mantém páginas legadas no Supabase |
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

**Arquivos novos — Cloudflare R2**, bucket `grid-files`. As páginas ficam em `materials/{slug}/{uuid}/pages/{i}.jpg`; anexos novos, inclusive de materiais antigos, em `comments/{slug}/{uuid}.{ext}`. Base pública: `https://pub-42970d75c5c14ba1bda61b8fc81c9d5d.r2.dev`, configurada em `config.js` sem credenciais. O endpoint S3 é exclusivo das operações de armazenamento.

**Arquivos legados — Supabase Storage**, bucket público `mockups`: páginas em `{slug}/pages/{i}.jpg`, fotos em `{slug}/photos/*`. Os arquivos existentes permanecem nesse provedor. Reenviar o mesmo PDF troca as páginas usadas pelo material para o R2, preservando o slug, nome editado, publicação e comentários. Não há migração em massa automática.

Continuam sendo guardadas **imagens renderizadas**, nunca o PDF original. Até 500 páginas por PDF e 7 MB por JPEG renderizado. O navegador renderiza o PDF e envia cada imagem diretamente ao R2 usando uma URL de PUT com dez minutos de validade, vinculada à chave, tipo e tamanho. A função da Vercel mantém as credenciais privadas e confirma todas as páginas antes de salvar a nova pasta no banco. Cada envio recebe uma pasta própria; falhas preservam a versão publicada. A comparação de `cover_version` recusa conclusões de envios concorrentes desatualizados.

Versões anteriores e páginas de envios incompletos permanecem no bucket até a exclusão explícita do material; isso também preserva abas que ainda usam a versão anterior. A exclusão no painel remove suas pastas no R2 e no Supabase e os comentários. Excluir um comentário também remove os anexos da thread nos dois provedores. Não há rotina de limpeza em segundo plano.

A política CORS do R2 permite `GET`, `HEAD` e `PUT` para `https://grid.vivoxmarketing.com.br`, `https://mockups-vivox.vercel.app`, `http://127.0.0.1:8130` e `http://localhost:8130`. Cabeçalhos: `Content-Type`, `Content-Length`, `Cache-Control`; expõe `ETag`, com cache de preflight de 3600 segundos. Previews com outro domínio precisam de uma origem explícita para testar uploads. [Referência do Cloudflare sobre CORS](https://developers.cloudflare.com/r2/buckets/cors/).

O endereço `r2.dev` fornecido pelo usuário tem limites de requisição e é destinado a desenvolvimento. Para tráfego maior, vincular um domínio próprio ao bucket e ajustar `R2_PUBLIC_URL`. [Documentação de buckets públicos](https://developers.cloudflare.com/r2/buckets/public-buckets/).

### Migração (já aplicada em produção)

A migração [20260909034739_arquivos_no_r2.sql](supabase/migrations/20260909034739_arquivos_no_r2.sql) adiciona `r2_prefix`, inicialmente nulo, e uma restrição que exige uma pasta pertencente ao slug do material. Não altera as políticas de acesso nem arquivos existentes.

A versão das capas foi acrescentada pela migração [20260909030733_versionar_capas_dos_materiais.sql](supabase/migrations/20260909030733_versionar_capas_dos_materiais.sql), já aplicada ao projeto existente. O trigger `mockups_renovar_versao_capa` executa a função `renovar_versao_capa` com os privilégios do chamador e `search_path` vazio; não altera as políticas existentes. A renovação foi verificada como `anon` em transação revertida, inclusive para reenvio com quantidade e tamanho de páginas iguais.

As colunas anteriores de publicação e comentários também já estão aplicadas:

```sql
alter table public.mockups  add column if not exists is_public  boolean not null default false;
alter table public.comments add column if not exists x          double precision;
alter table public.comments add column if not exists y          double precision;
alter table public.comments add column if not exists resolved   boolean not null default false;
alter table public.comments add column if not exists parent_id  uuid references public.comments(id) on delete cascade;
```

---

## Rodar localmente

Node.js 24. O frontend continua em HTML/CSS/JS puro; as duas dependências do SDK S3 são usadas apenas pela função do servidor. Para preparar os assets e rodar a API local:

```bash
npm ci
npm run dev
```

O servidor local atende `http://127.0.0.1:8130`, incluindo `/portfolio`, `/admin`, `/m/SLUG` e `/api/storage`. Reexecute após alterar arquivos. `npm run build` copia somente a lista permitida de assets para `public/`; Vercel usa essa pasta para arquivos estáticos e empacota `api/storage.js` separadamente. Não servir a raiz do repositório com um servidor genérico: `.env*` e código de servidor não devem ficar disponíveis por HTTP.

Configuração privada em `.env.r2.local`, ignorada pelo Git e pelo deploy:

| Variável de servidor | Conteúdo |
|---|---|
| `R2_ENDPOINT` | endpoint S3 da conta, sem o nome do bucket |
| `R2_BUCKET` | `grid-files` |
| `R2_ACCESS_KEY_ID` | chave de acesso do R2 |
| `R2_SECRET_ACCESS_KEY` | chave secreta do R2 |
| `ADMIN_PASSWORD_SHA256` | SHA-256 da senha atual do painel |
| `SESSION_SECRET` | segredo aleatório para assinar sessões e autorizações de envio |

Cadastre as mesmas variáveis criptografadas no projeto existente da Vercel, sem prefixos públicos. Para retomar em outro computador, use a autenticação da Vercel e `vercel env pull .env.r2.local --environment=development` após vincular o projeto. Nunca copie valores para README, commits ou conversas. O token de administração geral do Cloudflare não é necessário à aplicação.

Verificações após `npm ci`: `npm test`. Testes de navegador e de banco devem usar dados isolados ou transações revertidas, preservando os materiais reais.

## Deploy

Usar o projeto existente **mockups-vivox**, na equipe `equipevivox-7341s-projects`. O ID do projeto é `prj_gpzWlIxg6CuooSrEcKo2pTPiV6D8`; não criar outro projeto para publicar esta aplicação.

O projeto está conectado a `equipevivox/mockups-vivox` no GitHub, com **`main` como branch de produção**. Envie as alterações e os registros ao GitHub e acompanhe a publicação no [painel da Vercel](https://vercel.com/equipevivox-7341s-projects/mockups-vivox).

Para administrar ou publicar pela CLI em outro computador, autentique e vincule a pasta ao mesmo projeto:

```bash
npx --yes vercel login
npx --yes vercel link --yes --scope equipevivox-7341s-projects --project prj_gpzWlIxg6CuooSrEcKo2pTPiV6D8
npx --yes vercel deploy . --prod --yes --scope equipevivox-7341s-projects
```

Os domínios `grid.vivoxmarketing.com.br` e `mockups-vivox.vercel.app` apontam para a publicação de produção. A mudança do domínio personalizado não altera o nome do projeto Vercel, que continua **mockups-vivox**. O projeto usa o preset **Other**. Nesta branch R2, vercel.json define npm run build e a saída pública em public/; o SDK S3 fica nas dependências do servidor. A produção estática anterior é preservada até a autorização das variáveis e ativação da integração. Preservar os rewrites de `vercel.json`.

`.vercel/` e `.env*` são locais e ficam fora do Git. Cada computador deve autenticar sua própria sessão e executar o vínculo acima. O estado da integração automática com o GitHub está registrado em [CONTEXTO.md](CONTEXTO.md).

---

## Segurança (estado atual)

- O login do admin usa o usuário `VIVOX` e a senha existente, agora verificada no servidor. A sessão dura 12 horas em cookie assinado `HttpOnly`, `SameSite=Strict` e `Secure` em produção. A flag antiga de `sessionStorage` não concede acesso. As operações da API exigem origem permitida e JSON; uploads/exclusões de materiais exigem sessão. As credenciais do R2 nunca entram nos assets.
- Há limites básicos por IP/instância para login e anexos de comentários. Não constituem limitação global persistente; para isso, configurar regras no Firewall da Vercel. Comentários seguem o acesso por link já usado na aplicação.
- A **RLS do Supabase é permissiva para `anon`** — o slug do material funciona como "token" de acesso. A chave publishable dá acesso de leitura/escrita aos dados.
- O repositório está **público**, conforme consulta à API do GitHub em 2026-09-08. A descrição anterior como privado estava desatualizada. Para segurança de verdade seria preciso Supabase Auth + RLS restrita por usuário; o estado das políticas descrito acima ainda precisa ser revalidado no backend.
