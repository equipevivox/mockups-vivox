# Contexto atual — Mockups VIVOX

Última atualização: 2026-09-08 (America/Cuiaba).

## Objetivo e continuidade

Portfólio público VIVOX com revistas, folders e mockups, visualizador folheável e comentários ancorados nas páginas. Arquitetura e operação no [README.md](README.md); regras permanentes em [AGENTS.md](AGENTS.md); entregas no [HISTORICO.md](HISTORICO.md).

O usuário pediu manter alterações e contexto no GitHub para continuar em outro computador. Sempre atualizar os registros, fazer commit e enviar ao remoto ao concluir. Não registrar segredos, dados de clientes ou conversas completas. Não depender de acesso à conversa anterior.

## Repositório e produção

- Remoto: `https://github.com/equipevivox/mockups-vivox.git`, público, branch `main` acompanhando `origin/main`. Base desta tarefa: `60ec732`, já sincronizada antes das alterações.
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
- Fundo decorativo 3D com a primeira página de cada material público que tenha páginas. Sem capas duplicadas ou exemplos; posições livres e falhas de imagem ficam vazias. Novos materiais preservam as posições existentes. Movimento acompanha a rolagem e respeita movimento reduzido; fundo sem interação e `aria-hidden`.
- Consultas a cada 30 segundos somente com a aba visível, ao voltar à aba e ao recuperar conexão. Envios, publicação, exclusão e mudanças de nome notificam outras abas via `VX.notifyMaterialsChanged(id)`. Filtros afetam somente os cartões.

## Edição do nome

- No admin, **Renomear → Nome exibido → Salvar nome** altera `mockups.name`, usado pela página inicial e pelo visualizador. Não exige migração.
- Até 120 caracteres; remove espaços excedentes e extensão `.pdf`. Nome vazio é recusado. Erros preservam a entrada, há estado de salvamento, cancelamento por Escape e retorno de foco ao botão.
- Atualização limitada a `name`, filtrada por `id`, com `.select("id,name").single()` para confirmar a linha gravada. Slug, arquivos, links, comentários e publicação são preservados.
- Reenvio consulta o material pelo slug e atualiza apenas os dados das páginas, preservando o nome editado e `is_public`. Novos arquivos são inseridos com o nome original do PDF.

## Verificações e limites

- Nesta entrega: sintaxe JavaScript, diff e quatro testes automatizados (`node --test tests/material-name.test.cjs`) sobre validação, atualização restrita ao nome, erro do banco e confirmação da linha correta.
- Edge: temas em desktop 1440 × 1000 e celular 390 × 844; persistência após recarregar; retorno ao preto absoluto em 320px; logo centralizada, botão com área de 44px e sem transbordamento horizontal.
- Login e painel com logo verificados em desktop/celular. Testes isolados com respostas simuladas: nome vazio, erro de rede e nova tentativa, caracteres especiais, nome com 120 caracteres, Escape, atualização da página inicial, preservação do link, notificação entre abas, reenvio preservando nome/publicação e envio novo com nome do arquivo.
- Nenhum material real foi renomeado ou enviado pelos testes. Consultas ao Supabase confirmaram o schema existente e a permissão de atualização já utilizada pelo painel; nenhuma migração ou alteração de permissões foi feita.
- Detector visual funcionou em modo limitado (parser HTML indisponível) e apontou apenas a fonte Inter, preservada pela identidade VIVOX. Inspeção visual feita no navegador.
- Entregas anteriores verificaram filtros, estados vazios, falha de imagem/rede, novos materiais, posições estáveis e movimento reduzido. Preservar essas regras.
- Ao substituir uma capa sem mudar os dados do material, outra aba no mesmo navegador a renova pela notificação. Uma aba já aberta em outro computador precisa recarregar nesse caso: o schema não tem versão da capa nem `updated_at`.
- Autenticação e permissões herdadas estão documentadas no README; esta tarefa não alterou esse modelo.

## Retomada

Clonar ou atualizar a branch, ler os três registros e conferir Git antes de editar. Após publicar alterações, verificar o SHA no remoto e o deployment de produção no projeto existente.
