# Histórico de trabalho — Mockups VIVOX

Acrescente novas entradas no início, usando a data em `America/Cuiaba`. Registre o pedido, as alterações, decisões, verificações e pendências. O diff completo de cada entrega fica no histórico Git; este arquivo explica o contexto. Consulte [CONTEXTO.md](CONTEXTO.md) para o estado atual.

## 2026-09-09 — Registro para continuar em outra máquina

**Pedido:** salvar as alterações e informações no GitHub para trabalhar em outro computador na próxima sessão.

**Registro:** acrescentado ao contexto o roteiro de retomada, com a main para a versão publicada e codex/cloudflare-r2 para continuar a integração de arquivos. A branch R2 já contém a identidade visual publicada; preservada a pendência de autorização das variáveis na Vercel. Referências da entrega visual e do deployment incluídas. Credenciais e sessões locais permanecem fora do Git.

**Verificações:** fetch e pull --ff-only nas duas branches, inicialmente limpas e sem divergência; alterações desta tarefa restritas a CONTEXTO.md e HISTORICO.md, com revisão do diff e envio ao GitHub. Nenhuma alteração no código, em materiais, comentários ou configurações de produção.

## 2026-09-09 — Favicon, marca animada e painel com a identidade da inicial

**Pedido:** usar o V enviado como ícone da guia, animar sutilmente os quadradinhos da marca e manter no painel o estilo e as cores da página inicial.

**Alterações:** preservado o ícone original em assets e criado favicon SVG com enquadramento quadrado para portfólio, admin e visualizador. As logos originais recebem animação apenas nos quatro quadrados, em CSS, com pausa longa e sem dependências; gradientes isolados por instância e imagem estática como alternativa. Movimento interrompido com a logo fora da tela, aba oculta ou preferência de movimento reduzido. Painel e login compartilham o tema persistido da inicial: preto absoluto/creme, superfícies neutras, dourado e Inter. Logo centralizada no topo, botão de tema, hierarquia e espaçamento revisados, miniaturas maiores e ações de 44px adaptadas ao celular. Modal fechado deixa de receber foco. Renovadas URLs dos assets alterados.

**Verificações:** dez testes existentes passaram; sintaxe e diff conferidos. Edge em 1440×1000, 390×844 e 320×740: login, painel, home, temas, persistência após sair/recarregar, centralização e ausência de transbordamento. Formulário de renomear aberto e cancelado sem gravar; capas reais preservadas. Confirmados quatro grupos animados, pausa fora da tela e ao simular aba oculta, retomada e ausência de animação com movimento reduzido nativo. Favicon respondeu 200 com MIME SVG. Detector visual em modo limitado apontou somente Inter, mantida conforme a identidade. Nenhum material ou comentário foi alterado pelos testes.

**Publicação e R2:** alteração visual preparada a partir de main (11ca82a), independente da branch codex/cloudflare-r2. A integração R2 continua pendente de autorização explícita para guardar os segredos criptografados na Vercel; esta entrega visual não ativa o R2 nem modifica credenciais. Publicação confirmada em main no commit 5edd3af, deployment dpl_Cgw1kR7iom7SHNAuSUeZNhVEupZ9 em estado READY. Portfólio, painel, visualizador, favicon, estilos e scripts responderam 200 no domínio grid.vivoxmarketing.com.br e corresponderam à versão local validada.

## 2026-09-08 — Correção da atualização das capas e do parallax

**Pedido:** corrigir capas de fundo que não atualizavam automaticamente e o parallax, usando o novo componente React enviado como referência.

**Causas:** a URL da capa dependia de uma versão local à visita, sem identificar reenvios feitos em outro computador; o cache do Storage também precisava de uma chave própria. A matriz variava de altura ao receber novas capas e recentralizava as existentes. O movimento usava deslocamentos curtos fixos e apenas a rolagem da janela, com um intervalo mínimo que impedia concluir a perspectiva em páginas curtas. Imagens fora da área visível transformada dependiam de carregamento lazy.

**Correções:** aplicada e versionada a migração `20260909030733_versionar_capas_dos_materiais.sql`, acrescentando `cover_version` com renovação automática após atualização dos dados das páginas, inclusive quando estes mantêm os mesmos valores. Capas e páginas usam `cacheNonce` com essa versão; renomear/publicar não invalida imagens. Consulta pública a cada 15 segundos somente com a aba visível, além dos avisos já existentes. Pré-carregamento independente de visibilidade, substituição após carregar, descarte de respostas antigas, timeout e nova tentativa sem cache de falha. Matriz de altura estável, capas posicionadas por slot e colunas em sentidos opostos; progresso calculado pelo elemento que realmente rola, atualizado após mudanças de tamanho; mola e ângulos da referência, com zoom preservado. Mantidas a arquitetura estática, capas reais sem repetição, posições vazias, temas e movimento reduzido. Renovadas URLs dos scripts/estilos e miniaturas do admin/visualizador.

**Verificações:** dez testes automatizados e sintaxe JavaScript; verificação do trigger como `anon` em transação revertida, confirmando versão nova após reenvio, campos restantes preservados e versão estável ao editar nome/publicação. No Edge, atualização automática da capa em 15,5 segundos sem recarga/aviso entre abas; consultas suspensas ao ocultar a aba e retomadas ao voltar. Testes isolados com 20 capas confirmaram deslocamento zero das quatro existentes após inclusão de 16. Scroll do documento e de contêiner, reversão, desktop/celular, ausência de transbordamento, movimento reduzido e fundo decorativo conferidos. Visualizador com 24 páginas e avanço da página 1 para 2 confirmado após o carregamento completo, com URLs versionadas e sem alterar o motor de folheamento. Nenhuma imagem real foi enviada ou substituída pelos testes. O advisor não apontou a função nova; alertas anteriores do projeto compartilhado permanecem fora desta correção.

## 2026-09-08 — Temas claro/escuro, logo no admin e edição de nomes

**Pedido:** adicionar botão de tema claro/escuro à página inicial, incluir a logo no admin e permitir ajustar o nome exibido dos materiais.

**Alterações:** botão acessível no canto superior, preservando a logo centralizada; preferência local aplicada antes dos estilos e sincronizada entre abas, mantendo preto absoluto como padrão. Tema claro com contraste próprio para textos, capas decorativas e versão da logo com letras escuras. Logo original no login e no cabeçalho do painel. Opção Renomear em cada material, formulário com limite de 120 caracteres, validação, salvamento, erros com retenção do texto e cancelamento por teclado. URLs dos assets alterados renovadas.

**Decisões:** reutilizado `mockups.name`, já exibido no portfólio e no visualizador, sem migração. Atualização limitada ao nome, com confirmação da linha retornada. Slug, links, arquivos e comentários preservados. Reenvio do PDF atualiza apenas os dados das páginas, preservando o nome escolhido e a publicação; arquivos novos continuam recebendo o nome do PDF. Mudanças de nome notificam outras abas do portfólio. README e instruções permanentes atualizados.

**Verificações:** quatro testes automatizados de validação e gravação; sintaxe JavaScript e diff; temas, logo e formulário no Edge em 1440 × 1000, 390 × 844 e verificações em 320px. Sem transbordamento horizontal. Persistência do tema após recarregar e retorno ao fundo preto confirmados. Com dados simulados isolados do backend, verificados nome vazio, falha de rede, nova tentativa, caracteres especiais, nome com 120 caracteres, Escape, exibição no portfólio, link preservado, notificação, reenvio e novo envio. Consultas ao Supabase confirmaram o schema e a política existentes. Nenhum material real foi alterado pelos testes. Detector visual em modo limitado apontou somente Inter, mantida pela identidade VIVOX.

## 2026-09-08 — Logo VIVOX Grid centralizada e remoção do botão de admin

**Pedido:** retirar o botão de admin do canto e deixar a logo no centro do topo, utilizando o arquivo `VIVOX Grid.svg` enviado pelo usuário.

**Alterações:** adicionada a logo original em `assets/vivox-grid.svg`; substituída a marca anterior no topo público; centralização e escala responsiva de 230px a 307px; removido o atalho de administração. Preservado o link da logo para `/portfolio`, com texto alternativo e foco visível. O painel permanece acessível diretamente por `/admin`. Renovadas as URLs dos estilos alterados.

**Verificações:** diff e inspeção no Edge em 1440 × 1000 e 390 × 844. Confirmados o carregamento do SVG, a centralização, as larguras de 307px e 230px, a ausência do botão de admin e nenhum transbordamento horizontal ou erro de execução. O SVG fornecido foi mantido sem alterações no desenho.

## 2026-09-08 — Fundo preto absoluto, revistas maiores e remoção do rodapé

**Pedido:** remover o rodapé “ferramenta interna de revisão”, aplicar preto absoluto ao fundo e ampliar a visualização dos mockups das revistas, usando a captura enviada como referência.

**Alterações:** removido o elemento de rodapé e seu espaço reservado; base e sobreposições do portfólio em preto `#000000`; área da galeria ampliada para até 1880px e capas para até 420px. A lista usa quatro colunas a partir de 1680px, três a partir de 900px, duas a partir de 600px e uma em telas menores. Preservados textos centralizados, identidade dourada e capas decorativas em movimento. Renovadas as URLs dos estilos em `index.html` para evitar reutilização da versão anterior. Registrada a preferência pelo fundo preto nas instruções permanentes.

**Verificações:** diff e inspeção visual no Edge em 2508 × 1361, 1440 × 1000 e 390 × 844. Confirmados fundo computado preto puro sem gradiente na base, rodapé ausente, duas capas reais carregadas e nenhum transbordamento horizontal ou erro de execução. Em 1440px, a largura renderizada das revistas aumentou de aproximadamente 270px para 398px. O detector visual operou com análise limitada e apontou apenas Inter, mantida por fazer parte da identidade VIVOX. Os testes não gravaram dados no backend.

## 2026-09-08 — Revistas ampliadas, textos centralizados e domínio grid

**Pedido:** usar `grid.vivoxmarketing.com.br` mantendo o nome do projeto na Vercel; centralizar os textos; ampliar as revistas para linhas de quatro ou três e aumentar o zoom do fundo.

**Alterações:** cabeçalho, filtros e metadados centralizados; capas com largura de até 300px no lugar dos 152px fixos; lista com quatro colunas em telas largas, três em telas intermediárias, duas em tablets e uma em celulares, centralizando também as linhas incompletas. Ampliadas a matriz e as capas do fundo, com profundidade mais próxima e máscara escura concentrada no centro. Preservados a rolagem interativa, o movimento reduzido e os espaços sem material, sem criar capas de preenchimento.

**Domínio:** a API da Vercel confirmou `grid.vivoxmarketing.com.br` como domínio verificado do projeto existente `mockups-vivox`; a página respondeu 200. Corrigidos README e contexto. O alerta anterior de DNS era referente ao endereço antigo, substituído pelo usuário; não foi necessário alterar DNS ou criar projeto.

**Verificações:** sintaxe JavaScript e diff; avaliação visual no Edge em desktop e celular, com as duas revistas reais carregadas e sem erros de execução. Em prévia local descartável com nove cartões, confirmadas linhas de 4/3/2/1 em 1440/1024/768/390px, centralização e ausência de transbordamento horizontal. Confirmados filtros e estado vazio, preservação do fundo ao filtrar, mudança de perspectiva ao rolar e ausência de animação com movimento reduzido. A análise mecânica dos estilos e script alterados não apontou problemas. Nenhum dado foi gravado no backend pelos testes.

## 2026-09-08 — Textos de abertura da página de materiais

**Pedido:** substituir o eyebrow, o título e a descrição pelos textos fornecidos pelo usuário.

**Alterações:** `index.html` passa a exibir **MATERIAIS VIVOX**, **Materiais criados para sua marca** e a descrição “Explore os materiais desenvolvidos pela VIVOX. Abra cada projeto para visualizar os detalhes, folhear as páginas e deixar seus comentários.”, com quebra de linha entre as frases. Preservados o destaque dourado do título e os filtros **Todos**, **Revistas**, **Folders** e **Mockups**; o pedido não trouxe novos nomes para os filtros.

**Verificação:** revisão do diff e dos textos no HTML. O commit `c1580a2` gerou automaticamente o deployment `dpl_89UXNt3ck5xcHrEU3nXFdGSbwxRF`, em estado `READY`. As rotas `/` e `/portfolio` do alias `mockups-vivox.vercel.app` responderam 200 e entregaram HTML idêntico ao arquivo local. Alteração restrita ao conteúdo de abertura, sem modificar scripts, rotas ou comportamento das capas.

**Limitação observada:** o domínio personalizado `mockups.vivoxmarketing.com.br` falhou na resolução DNS durante a verificação, inclusive com resposta de nome inexistente pelo resolvedor `1.1.1.1`. O alias da Vercel funciona. Nenhuma configuração de domínio ou DNS foi alterada nesta tarefa.

## 2026-09-08 — Vínculo ao projeto existente e publicação na Vercel

**Pedido:** conectar à Vercel, usar o projeto já existente `mockups-vivox` e vinculá-lo ao GitHub.

**Alterações:** localizada a aplicação na equipe `equipevivox-7341s-projects` pela CLI e pelo painel; vinculada a pasta ao projeto `prj_gpzWlIxg6CuooSrEcKo2pTPiV6D8`; publicada a versão com o fundo de capas em produção. Acrescentado `.env*` ao `.gitignore` e documentados o domínio principal, a equipe, o ID e os comandos de vinculação em outro computador.

**Correção de diagnóstico:** a conclusão da tarefa anterior de que essa conta não continha o projeto estava incorreta. A listagem da integração retornou vazia, mas a consulta direta da CLI e o painel localizaram o projeto. Nenhum projeto substituto foi criado.

**Verificações:** deployment `dpl_B3NDBRje1KHsraPq3F8LtWr7U373` em estado `READY`, associado a `mockups.vivoxmarketing.com.br` e `mockups-vivox.vercel.app`. Confirmadas respostas HTTP 200 nas rotas do portfólio, painel e revista, além dos novos arquivos CSS/JS. As duas revistas reais carregaram no navegador. A simulação de upload confirmou a exclusão de `.env.local`, `.git` e `.vercel`.

**Integração GitHub:** após a confirmação de acesso do usuário no GitHub, a conexão por `vercel git connect` retornou `Connected`. A API do projeto confirmou `equipevivox/mockups-vivox` como origem GitHub e `main` como branch de produção. A pasta local continua conectada a `origin/main` e usa o Git autenticado para enviar código e contexto.

**Validação da publicação automática:** o envio do commit `77ae404` à `main` gerou o deployment `dpl_GcB5EQBF9pEJCCqSGaBZxSWuJLXq`, confirmado pela API com origem `git`, destino `production`, a mesma identificação do commit e estado `READY`. Nenhuma pendência de conexão permanece.

## 2026-09-08 — Fundo 3D com as capas publicadas

**Pedido:** usar o componente de galeria 3D enviado como referência para o fundo da tela; preencher com capas reais, deixar posições excedentes vazias e incorporar novos materiais.

**Alterações:**

- Adicionados `portfolio-background.js` e `portfolio-background.css` ao portfólio, com perspectiva 3D, deslocamento das colunas ao rolar, composição responsiva e movimento reduzido.
- Distribuição de uma capa por material, sem duplicação ou imagens genéricas; novas capas ocupam posições livres, e imagens com falha deixam o espaço vazio.
- Consulta dos materiais públicos no servidor e atualização periódica enquanto a aba está visível, além de atualização ao voltar à aba ou recuperar a conexão.
- Notificação entre abas após concluir envio, publicação ou exclusão no painel, incluindo renovação da URL de capa quando há reenvio no mesmo navegador.
- Preservados os filtros, links e cartões do portfólio; adicionados estado acessível dos filtros, indicação de foco e botão para repetir o carregamento após falha inicial.
- Atualizados README, contexto e instruções permanentes para manter as regras de preenchimento do fundo.

**Decisões:** adaptar o exemplo React/Framer Motion a HTML/CSS/JS nativos, conforme a arquitetura existente. O fundo usa apenas materiais marcados com **Mostrar no portfólio**, acompanhando a visibilidade pública já definida pelo projeto. Os filtros de categoria não alteram o fundo.

**Verificações:** sintaxe dos quatro scripts alterados e diff; consulta real dos materiais públicos; inspeção em Edge nos tamanhos 1440 × 1000 e 390 × 844; ausência de repetição e transbordamento horizontal; filtros e movimento reduzido. Em sessão isolada, verificadas lista vazia, inclusão de uma segunda capa sem deslocar a primeira, despublicação, exclusão de todas as capas, falha de imagem e preservação da lista durante falha temporária de rede. Os testes não gravaram dados no backend. O detector visual operou em modo limitado e apontou o uso de Inter, mantido por ser a identidade existente da VIVOX.

**Limites e publicação:** novos materiais publicados são detectados pela consulta periódica. A substituição do mesmo arquivo sem mudar seus metadados exige recarga em uma aba já aberta em outro computador; a notificação imediata funciona entre abas do mesmo navegador. O deploy ficou pendente após a listagem da integração não encontrar o projeto; essa conclusão foi corrigida na tarefa seguinte, registrada acima. Nenhum projeto alternativo foi criado.

**Verificação final:** a consulta periódica incorporou uma capa em 29 segundos, sem recarregar a página ou disparar foco. Confirmados o movimento ao rolar, as duas capas reais carregadas e os links dos materiais na versão final dos scripts.

## 2026-09-08 — Conexão ao GitHub e contexto entre computadores

**Pedido:** conectar esta pasta a `equipevivox/mockups-vivox` e manter as alterações e o contexto no GitHub para permitir a retomada em outro computador.

**Alterações:**

- Configurado `origin` e baixada a branch `main`, preservando o histórico existente.
- Acrescentado a `AGENTS.md` o procedimento de leitura, atualização do contexto, commit, envio ao GitHub e confirmação do estado remoto.
- Criados `CONTEXTO.md` e este histórico como registros compartilhados.
- Acrescentadas ao README as instruções para clonar, atualizar e retomar o trabalho em outro computador.
- Corrigida a descrição da visibilidade do repositório no README: a API do GitHub informa que ele é público.

**Decisões:** manter as instruções técnicas existentes e usar arquivos Markdown no próprio repositório, acessíveis em qualquer computador. Registrar o contexto relevante a cada entrega, junto com as mudanças da tarefa.

**Verificações:** acesso de leitura confirmado pela integração GitHub; branch padrão e commit inicial conferidos; referências locais da documentação e `git diff --check` verificados antes da publicação. O código da aplicação foi preservado.

**Publicação:** a integração GitHub devolveu erro 403 ao tentar gravar, apesar de informar permissão de escrita na consulta do repositório. O Git local passou na verificação de acesso ao remoto e foi escolhido para publicar; a identidade do commit corresponde ao perfil GitHub autenticado e foi configurada somente neste repositório.

**Pendências e limites:** nenhuma implementação funcional foi solicitada. A aplicação em execução, a produção e as políticas do backend não foram verificadas; as observações técnicas e de segurança anteriores continuam documentadas no README.
