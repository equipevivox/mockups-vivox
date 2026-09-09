# Contexto atual — Mockups VIVOX

Última atualização: 2026-09-08 (America/Cuiaba).

## Objetivo

Aplicação VIVOX para publicar um portfólio de materiais e revisar PDFs renderizados em imagens, com visualização folheável e comentários ancorados na página. A arquitetura e o funcionamento estão no [README.md](README.md).

## Preferência permanente do usuário

Manter o registro de alterações e o contexto no GitHub para retomar o trabalho em outro computador. Ao terminar cada tarefa relevante, atualizar este resumo e o [HISTORICO.md](HISTORICO.md), criar um commit e enviá-lo ao remoto. Seguir o procedimento de [AGENTS.md](AGENTS.md).

## Estado confirmado nesta tarefa

- Repositório: `https://github.com/equipevivox/mockups-vivox`.
- Branch principal: `main`. A pasta de trabalho foi conectada a `origin` e passou a acompanhar `origin/main`.
- Código recebido: commit `a7aee3dd7fc1d8c3b69b7cbf0c2f30ff2c548e3c` — “Portfolio VIVOX + visualizador com comentarios em balao”.
- Aplicação estática em HTML/CSS/JS, sem etapa de build; arquivos de portfólio, administração e visualizador presentes.
- Esta tarefa acrescenta somente documentação de continuidade. Os arquivos da aplicação não foram alterados.
- Visibilidade consultada na API do GitHub: pública. O README foi corrigido porque dizia que o repositório era privado.

## Decisões para a continuidade

- `AGENTS.md` guarda as regras estáveis; este arquivo guarda o estado atual; `HISTORICO.md` guarda o registro das tarefas. O Git mantém as alterações exatas de cada commit.
- Atualizar a cópia local antes de começar, preservando trabalho existente, e publicar os registros ao concluir. O contexto compartilhado deve ser suficiente para trabalhar sem a conversa anterior.
- Não registrar segredos, dados de clientes ou transcrições completas. Não depender de caminhos específicos de um computador.
- Consultar as restrições técnicas já documentadas em `AGENTS.md` antes de alterar folheamento, comentários, renderização de PDFs ou rotas.

## Validação e limites

- Acesso ao repositório, histórico e rastreamento de `main` conferidos.
- A integração GitHub permitiu leitura, mas recusou a criação de uma árvore Git com erro 403. A publicação desta entrega usa o Git local autenticado; outro computador precisa ter sua própria autenticação para enviar commits.
- Revisão documental: instruções anteriores preservadas, referências locais e diff conferidos.
- O funcionamento da aplicação em navegador e o estado do backend não foram testados nesta tarefa de documentação.
- O endereço de produção informado no README não foi revalidado e nenhum deploy foi executado nesta tarefa.
- Os pontos de autenticação e permissões descritos no README são contexto herdado, não resultado de uma auditoria atual.

## Próximos passos

- Retomar pela solicitação seguinte do usuário; nenhuma mudança funcional adicional foi pedida nesta tarefa.
- Se houver trabalho futuro de segurança, conferir a autenticação e as permissões reais do backend levando em conta a visibilidade pública do repositório.
- Em outro computador, clonar ou atualizar a branch de trabalho, abrir sua pasta no Codex e ler estes registros antes de editar.
