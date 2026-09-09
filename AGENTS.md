# Instruções para agentes

Leia o `README.md` primeiro — ele tem a arquitetura, as rotas e o schema.

## Continuidade entre computadores

O usuário pediu que as alterações e o contexto sejam sempre mantidos no GitHub, para retomar o projeto em outro computador. Esta é uma regra permanente deste repositório.

### Ao iniciar uma tarefa

1. Leia `README.md`, `CONTEXTO.md` e as entradas mais recentes de `HISTORICO.md`, além destas instruções.
2. Confira `git status --short --branch`, `git remote -v` e `git log -5 --oneline`. O remoto esperado é `https://github.com/equipevivox/mockups-vivox.git`; a branch principal é `main`.
3. Execute `git fetch origin`. Com a árvore limpa e a branch acompanhando seu remoto, atualize com `git pull --ff-only` e releia a documentação se ela mudou. Preserve alterações locais; se houver divergência, examine os commits antes de integrar e não use reset destrutivo ou force push.
4. Use os arquivos versionados e o estado real do código como contexto compartilhado. Não presuma acesso à conversa de outro computador. Se a rede falhar, informe que o contexto remoto ainda não foi conferido.

### Ao concluir uma tarefa com alterações ou decisões relevantes

1. Atualize `CONTEXTO.md` com o estado atual, decisões, validações, limitações e próximos passos. Mantenha esse resumo curto e substitua informações que ficaram desatualizadas.
2. Acrescente uma entrada datada no início de `HISTORICO.md`, sem apagar entradas anteriores: pedido, alterações, motivo das decisões, verificações e pendências. Atualize também o `README.md` quando mudar arquitetura, configuração ou uso.
3. Revise o diff, faça as verificações adequadas e inclua somente arquivos desta tarefa em um commit com mensagem em português. Não inclua alterações alheias, credenciais, dados de clientes ou conversas completas.
4. Envie os commits e a documentação para `origin` ao concluir, salvo instrução explícita do usuário para manter o trabalho local. O pedido de manter o registro no GitHub autoriza essa sincronização de rotina. Respeite a branch em uso e as proteções do repositório; para uma nova branch de trabalho, use o prefixo `codex/`.
5. Verifique se o commit local está no remoto e informe o commit e a branch na entrega. Se não conseguir publicar, registre a pendência e diga claramente que as alterações continuam locais. Nunca declare sincronização apenas por ter criado um commit.

O registro é atualizado durante o trabalho do agente; não é um serviço de sincronização em segundo plano. O histórico Git guarda o diff exato, `HISTORICO.md` explica as entregas e `CONTEXTO.md` orienta a retomada.

## Como trabalhar aqui

- **Sem build.** HTML/CSS/JS puro servido estaticamente. Não introduza bundler, framework ou `node_modules` sem necessidade real.
- Rodar local: `python -m http.server 8130` na raiz.
- Deploy: `vercel deploy . --prod --yes` (o alias de produção atualiza sozinho).
- Escreva em **português do Brasil** — comentários de código, textos de interface e mensagens de commit.
- Toda a interface segue a identidade VIVOX: dourado `#CCB691 → #876224`, fonte Inter e as variáveis CSS de `style.css`. O portfólio e o painel (incluindo login) oferecem tema claro e escuro; o padrão escuro usa **preto absoluto `#000000`** no fundo e nas sobreposições. Preserve a escolha em `vivox_theme`; o painel acompanha a escolha e o visualizador mantém os fundos escuros originais. Não reintroduzir o rodapé “ferramenta interna de revisão de materiais”.
- No topo público, manter a logo original `assets/vivox-grid.svg` centralizada e sem botão de admin. O painel é acessado diretamente por `/admin`, também com logo centralizada e botão de tema. Os quadradinhos da marca usam animação sutil, pausada fora da tela, em aba oculta e com movimento reduzido. O favicon usa o V original fornecido pelo usuário.

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
- `mockups.name` é o **nome exibido editável**, com limite de 120 caracteres na edição. Renomear não altera slug, links, páginas ou comentários. Ao reenviar o PDF, preserve o nome editado e `is_public`; atualize somente os dados das páginas. Novos materiais recebem inicialmente o nome do arquivo.
- `mockups.cover_version` é gerado pelo banco. O trigger renova a versão em `UPDATE OF num_pages, aspect`, inclusive quando os valores permanecem iguais. Mantenha essa atualização **depois** de concluir o envio das páginas; use `VX.pageUrl(slug, indice, cover_version)` para renovar o cache em todos os computadores. Renomear ou publicar não deve alterar a versão.
- São guardadas as **páginas renderizadas em JPEG**, nunca o PDF original.
- Comentários sem `x`/`y` são anteriores ao recurso de pins: aparecem só na lista lateral, sem marcador na página. Trate esse caso como válido.

## Ao mexer no fundo do portfólio

- Use somente a primeira página dos materiais publicados, sem duplicar capas ou preencher posições vazias com imagens de exemplo. Este comportamento foi solicitado explicitamente pelo usuário.
- Preserve as posições existentes ao adicionar materiais e deixe o espaço vazio quando a imagem falhar.
- Não dimensione a altura da matriz pela quantidade de capas: isso recentraliza e desloca as imagens existentes. Preserve posições absolutas por slot, carregamento independente de `loading=lazy` e descarte de respostas de versões antigas.
- Vincule o parallax ao elemento que realmente rola e ao intervalo `scrollHeight - clientHeight`. Atualize esse cálculo quando o conteúdo mudar; mantenha colunas em sentidos opostos e a animação parada quando o movimento terminar.
- Mantenha o fundo decorativo (`aria-hidden`, sem interação), a preferência de movimento reduzido e a consulta periódica somente com a aba visível.
- No painel, chame `VX.notifyMaterialsChanged(id)` após concluir envio, publicação, exclusão ou mudança de nome; isso mantém outras abas do portfólio atualizadas. Os filtros de categoria continuam atuando somente nos cartões.

## Ao mexer em comentários

O pin precisa continuar sendo **filho do elemento da página** (`.pg`) ou do painel do folder — é isso que faz ele acompanhar a virada. Não posicione pins em uma camada solta por cima do livro.
