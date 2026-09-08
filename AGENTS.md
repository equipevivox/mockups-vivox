# Instruções para agentes

Leia o `README.md` primeiro — ele tem a arquitetura, as rotas e o schema.

## Como trabalhar aqui

- **Sem build.** HTML/CSS/JS puro servido estaticamente. Não introduza bundler, framework ou `node_modules` sem necessidade real.
- Rodar local: `python -m http.server 8130` na raiz.
- Deploy: `vercel deploy . --prod --yes` (o alias de produção atualiza sozinho).
- Escreva em **português do Brasil** — comentários de código, textos de interface e mensagens de commit.
- Toda a interface segue a identidade VIVOX: dourado `#CCB691 → #876224` sobre fundo escuro `#0F0F0B`, fonte Inter. Use as variáveis CSS já definidas em `style.css`.

## Armadilhas que já custaram caro

Estas foram descobertas depurando em produção. Não desfaça sem entender o porquê.

### turn.js
1. As páginas precisam de **tamanho explícito em px** e das **imagens já carregadas** antes de chamar `.turn()`. Caso contrário elas colapsam para altura 0 e o init falha silenciosamente (`turn('page')` fica `undefined`). Por isso o código faz `preloadImages()` e **repete o init até `turn('page')` retornar um valor válido**.
2. `display: contents` em qualquer elemento **pai** quebra o turn.js. `#flipbook` precisa ficar direto no `.flip-area`.
3. `autoCenter: true` já resolve a capa sozinha e os spreads — não recentralize na mão.
4. No modo de comentário, chame `turn('disable', true)`; senão o clique para posicionar o pin vira a página.

### PDF.js
O worker **precisa ser same-origin** (`/pdf.worker.min.js`, versionado no repo). Apontar o `workerSrc` para o CDN faz o navegador bloquear o Worker, o PDF.js cai na thread principal e **trava** com PDFs de várias páginas. Foi assim que ele "não abria" antes.

### Vercel
- **Nunca ligue `cleanUrls: true`** no `vercel.json` — anula os `rewrites` e as rotas `/portfolio` e `/m/:slug` passam a dar 404.
- Em `viewer.html`, todo asset precisa de **caminho absoluto** (`/common.js`, `/lib/turn.min.js`). Relativo resolve para `/m/...` e quebra.

### Geral
- Evite `requestAnimationFrame` no caminho crítico de carregamento: ele não dispara em aba não renderizada. Use o helper `VX.nextFrame()`, que tem fallback por `setTimeout`.
- Deleção no Storage do Supabase só pela **Storage API** (`sb.storage.remove()`). SQL direto em `storage.objects` é bloqueado pelo trigger `protect_delete`.

## Dados

- O `id` do material é um **slug derivado do nome do arquivo** (MAIÚSCULAS, sem acento, espaços → `_`). Reenviar um PDF com o mesmo nome **sobrescreve** o material.
- São guardadas as **páginas renderizadas em JPEG**, nunca o PDF original.
- Comentários sem `x`/`y` são anteriores ao recurso de pins: aparecem só na lista lateral, sem marcador na página. Trate esse caso como válido.

## Ao mexer em comentários

O pin precisa continuar sendo **filho do elemento da página** (`.pg`) ou do painel do folder — é isso que faz ele acompanhar a virada. Não posicione pins em uma camada solta por cima do livro.
