# Histórico de trabalho — Mockups VIVOX

Acrescente novas entradas no início, usando a data em `America/Cuiaba`. Registre o pedido, as alterações, decisões, verificações e pendências. O diff completo de cada entrega fica no histórico Git; este arquivo explica o contexto. Consulte [CONTEXTO.md](CONTEXTO.md) para o estado atual.

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
