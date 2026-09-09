# Contexto atual — Mockups VIVOX

Última atualização: 2026-09-08 (America/Cuiaba).

## Objetivo e continuidade

Portfólio público VIVOX com revistas, folders e mockups, visualizador folheável e comentários ancorados nas páginas. Arquitetura e operação no [README.md](README.md); regras permanentes em [AGENTS.md](AGENTS.md); entregas no [HISTORICO.md](HISTORICO.md).

O usuário pediu manter alterações e contexto no GitHub para continuar em outro computador. Sempre atualizar os registros, fazer commit e enviar ao remoto ao concluir. Não registrar segredos, dados de clientes ou conversas completas. Não depender de acesso à conversa anterior.

## Repositório e produção

- Remoto: `https://github.com/equipevivox/mockups-vivox.git`, público, branch `main` acompanhando `origin/main`. Base desta tarefa: `09fc00b`, já sincronizada antes das alterações.
- Produção: `https://grid.vivoxmarketing.com.br`, alias `https://mockups-vivox.vercel.app`. O domínio antigo `mockups.vivoxmarketing.com.br` foi substituído pelo usuário; não há pendência de recuperá-lo.
- Vercel: projeto existente **mockups-vivox**, ID `prj_gpzWlIxg6CuooSrEcKo2pTPiV6D8`, equipe `equipevivox-7341s-projects` (`team_14ydzpU22f732BVCX1lK6WA2`). Pasta vinculada localmente por `.vercel/project.json`.
- GitHub conectado ao projeto Vercel; envios à `main` disparam produção automaticamente. Fluxo já confirmado em entregas anteriores; verificar o deployment e seu SHA após cada push.
- Aplicação estática HTML/CSS/JS, sem build. Supabase: `kthestvyzvbbpnsulned`. Não instalar React, bundler ou dependências de frontend apenas para efeitos visuais.
- Usar Git local autenticado para publicar. Cada computador precisa de sua autenticação. `.env*`, `.vercel` e `node_modules` ficam fora do Git; a CLI pode baixar variáveis locais.

## Interface atual

- Logo **VIVOX Grid** centralizada no topo público, sem botão de admin; painel acessível diretamente em `/admin`. A mesma logo aparece no login e no cabeçalho do painel.
- Botão no canto superior alterna tema claro/escuro apenas na página inicial. Escuro é o padrão, com fundo preto `#000000`; claro usa `#faf9f6` e letras escuras na mesma logo, preservando o dourado. A escolha em `vivox_theme` é aplicada antes dos estilos e sincronizada entre abas do navegador. Sem acesso ao armazenamento, a troca continua funcionando na aba.
- Textos solicitados: **MATERIAIS VIVOX**, **Materiais criados para sua marca** e descrição orientando explorar materiais, folhear páginas e comentar. Filtros: Todos, Revistas, Folders e Mockups.
- Textos, filtros e metadados centralizados. Capas de até 420px, galeria de até 1880px; linhas de 4/3/2/1 a partir de 1680/900/600/abaixo de 600px. Linhas incompletas centralizadas. Rodapé de ferramenta interna removido.
- Fundo decorativo 3D com a primeira página de cada material público que tenha páginas. Sem capas duplicadas ou exemplos; posições livres e falhas de imagem ficam vazias. Novos materiais preservam as posições existentes. Posições absolutas por slot, com altura da matriz independente da quantidade, evitando deslocamento ao adicionar capas. Colunas movem-se em sentidos opostos, usando o elemento que realmente rola (documento ou contêiner) e o intervalo real de início a fim; mola e ângulos adaptados da nova referência enviada. Movimento reduzido, fundo sem interação e `aria-hidden` preservados.
- Consultas a cada 15 segundos somente com a aba visível, ao voltar à aba e ao recuperar conexão. Envios, publicação, exclusão e mudanças de nome notificam outras abas via `VX.notifyMaterialsChanged(id)`. Filtros afetam somente os cartões.

## Edição do nome

- No admin, **Renomear → Nome exibido → Salvar nome** altera `mockups.name`, usado pela página inicial e pelo visualizador. Não exige migração.
- Até 120 caracteres; remove espaços excedentes e extensão `.pdf`. Nome vazio é recusado. Erros preservam a entrada, há estado de salvamento, cancelamento por Escape e retorno de foco ao botão.
- Atualização limitada a `name`, filtrada por `id`, com `.select("id,name").single()` para confirmar a linha gravada. Slug, arquivos, links, comentários e publicação são preservados.
- Reenvio consulta o material pelo slug e atualiza apenas os dados das páginas, preservando o nome editado e `is_public`. Novos arquivos são inseridos com o nome original do PDF.

## Verificações e limites

- Dez testes automatizados (`node --test tests/*.test.cjs`): validação e edição de nomes, posições estáveis, exclusão de privados/vazios, respostas atrasadas, falha e nova tentativa de imagem, scroll curto, scroll em contêiner, inversão, movimento reduzido e interrupção da animação. Sintaxe JavaScript e diff conferidos.
- Edge: temas em desktop 1440 × 1000 e celular 390 × 844; persistência após recarregar; retorno ao preto absoluto em 320px; logo centralizada, botão com área de 44px e sem transbordamento horizontal.
- Login e painel com logo verificados em desktop/celular. Testes isolados com respostas simuladas: nome vazio, erro de rede e nova tentativa, caracteres especiais, nome com 120 caracteres, Escape, atualização da página inicial, preservação do link, notificação entre abas, reenvio preservando nome/publicação e envio novo com nome do arquivo.
- Na entrega de nomes, nenhum material real foi renomeado ou enviado pelos testes. Na correção do fundo, foi aplicada a migração `20260909030733_versionar_capas_dos_materiais.sql`, que adiciona `cover_version` e o trigger. Verificação como `anon` em transação revertida confirmou renovação após reenvio e preservação da versão ao editar nome/publicação. Nenhuma página real foi enviada ou substituída pelos testes e as políticas existentes foram preservadas.
- Detector visual funcionou em modo limitado (parser HTML indisponível) e apontou apenas a fonte Inter, preservada pela identidade VIVOX. Inspeção visual feita no navegador.
- Entregas anteriores verificaram filtros, estados vazios, falha de imagem/rede, novos materiais, posições estáveis e movimento reduzido. Preservar essas regras.
- Corrigida a limitação de atualização entre computadores: `cover_version` agora vem do banco e compõe `cacheNonce` nas URLs de capa e páginas. O trigger renova a versão após reenvio, mesmo quando os dados das páginas continuam iguais. Abas já abertas recebem a nova versão na consulta periódica, sem recarregar. Edições de nome/publicação preservam a versão.
- Autenticação e permissões herdadas estão documentadas no README; esta tarefa não alterou esse modelo.

- Correção do fundo verificada no Edge em 1440 × 1000 e 390 × 844. Colunas em sentidos opostos; fim do scroll alcança o estado final da perspectiva, inclusive em contêiner interno; celular com duas colunas e sem transbordamento horizontal. Preferência de movimento reduzido elimina transformações inline.
- Teste de atualização automática em iframe isolado, com scripts reais e dados simulados: somente a versão da capa mudou, sem aviso entre abas ou recarga; nova URL carregada em 15,5 segundos. Nenhum timer de consulta ficou ativo com a aba marcada como oculta; retorno disparou nova consulta. Adicionar 16 capas de teste preservou as coordenadas das quatro existentes (deslocamento 0).
- Visualizador verificado após concluir o carregamento: 24 páginas, avanço da página 1 para 2 e URLs versionadas, sem erros de execução. O motor de folheamento não foi alterado.
- Pré-carregamento das capas é independente da posição transformada. Resposta de versão antiga é descartada; falha/timeout deixa o espaço vazio e a consulta seguinte tenta com nova chave. Requisições inalteradas não baixam imagens novamente.

## Retomada

Clonar ou atualizar a branch, ler os três registros e conferir Git antes de editar. Após publicar alterações, verificar o SHA no remoto e o deployment de produção no projeto existente.
