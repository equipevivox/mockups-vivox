# Contexto atual — Mockups VIVOX

Última atualização: 2026-09-08 (America/Cuiaba).

## Objetivo

Aplicação VIVOX para publicar um portfólio de materiais e revisar PDFs renderizados em imagens, com visualização folheável e comentários ancorados na página. A arquitetura e o funcionamento estão no [README.md](README.md).

## Preferência permanente do usuário

Manter o registro de alterações e o contexto no GitHub para retomar o trabalho em outro computador. Ao terminar cada tarefa relevante, atualizar este resumo e o [HISTORICO.md](HISTORICO.md), criar um commit e enviá-lo ao remoto. Seguir o procedimento de [AGENTS.md](AGENTS.md).

## Estado confirmado nesta tarefa

- Repositório: `https://github.com/equipevivox/mockups-vivox`.
- Branch principal: `main`. A pasta de trabalho foi conectada a `origin` e passou a acompanhar `origin/main`.
- Base desta tarefa: commit `ab49378` — “Documenta contexto e rotina de sincronizacao entre computadores”.
- Aplicação estática em HTML/CSS/JS, sem etapa de build; arquivos de portfólio, administração e visualizador presentes.
- Implementado o fundo 3D do portfólio em `portfolio-background.js` e `portfolio-background.css`, a partir do componente de referência enviado pelo usuário, adaptado para a stack estática.
- O fundo usa uma capa por material público com páginas, mantém posições não utilizadas vazias e incorpora novos materiais sem repetir as capas anteriores. Não foram acrescentadas imagens demonstrativas.
- O portfólio consulta apenas materiais públicos a cada 30 segundos com a aba visível e recebe notificações do painel após envios, publicações ou exclusões. Há duas revistas publicadas na consulta realizada nesta tarefa.
- Capas indisponíveis ficam invisíveis; novas tentativas ocorrem nas atualizações. O fundo respeita movimento reduzido e não intercepta os controles.
- Visibilidade consultada na API do GitHub: pública. O README foi corrigido porque dizia que o repositório era privado.

## Decisões para a continuidade

- `AGENTS.md` guarda as regras estáveis; este arquivo guarda o estado atual; `HISTORICO.md` guarda o registro das tarefas. O Git mantém as alterações exatas de cada commit.
- Atualizar a cópia local antes de começar, preservando trabalho existente, e publicar os registros ao concluir. O contexto compartilhado deve ser suficiente para trabalhar sem a conversa anterior.
- Não registrar segredos, dados de clientes ou transcrições completas. Não depender de caminhos específicos de um computador.
- Consultar as restrições técnicas já documentadas em `AGENTS.md` antes de alterar folheamento, comentários, renderização de PDFs ou rotas.
- Manter a regra **Mostrar no portfólio** também para o fundo. Os filtros de categoria alteram os cartões, sem apagar as capas do fundo.
- Não instalar React, Tailwind ou Framer Motion apenas para este efeito: a adaptação usa CSS 3D e JavaScript nativos.

## Validação e limites

- Acesso ao repositório, histórico e rastreamento de `main` conferidos.
- A integração GitHub recusou escrita na tarefa anterior. Usar o Git local autenticado para publicar; outro computador precisa ter sua própria autenticação para enviar commits.
- Sintaxe JavaScript e diff conferidos. A visualização local foi inspecionada no Edge em desktop (1440 × 1000) e celular (390 × 844), com as duas capas reais, sem transbordamento horizontal ou erros de execução.
- Cenários de ausência de materiais, inclusão, despublicação, exclusão, falha de imagem, falha de rede, filtros e movimento reduzido verificados com respostas simuladas isoladas do banco real.
- A consulta periódica incorporou um material em 29 segundos, sem recarga ou evento de foco; a rolagem alterou a perspectiva e a posição das colunas conforme esperado.
- Nenhuma migração, alteração nas permissões do backend ou upload de teste foi realizado em produção.
- Publicação na Vercel pendente: a integração e a CLI estão autenticadas como `equipevivox-7341`, cuja equipe não lista projetos. O projeto `mockups-vivox` não foi encontrado nessa conta. Foi solicitado ao usuário identificar a conta/equipe que hospeda o endereço atual.
- Reenvio do mesmo arquivo renova a capa por notificação entre abas do mesmo navegador e em novas visitas. Uma aba já aberta em outro computador precisa ser recarregada quando os dados do material não mudam, pois o schema atual não tem versão da capa nem `updated_at`.
- Os pontos de autenticação e permissões descritos no README são contexto herdado, não resultado de uma auditoria atual.

## Próximos passos

- Conectar a conta Vercel que contém o projeto existente e publicar a versão validada no endereço atual, sem criar um projeto substituto. Conferir `/`, `/portfolio`, `/admin` e `/m/:slug` após publicar.
- Se houver trabalho futuro de segurança, conferir a autenticação e as permissões reais do backend levando em conta a visibilidade pública do repositório.
- Em outro computador, clonar ou atualizar a branch de trabalho, abrir sua pasta no Codex e ler estes registros antes de editar.
