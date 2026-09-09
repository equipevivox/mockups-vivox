# Contexto atual — Mockups VIVOX

Última atualização: 2026-09-08 (America/Cuiaba).

## Objetivo

Aplicação VIVOX para publicar um portfólio de materiais e revisar PDFs renderizados em imagens, com visualização folheável e comentários ancorados na página. A arquitetura e o funcionamento estão no [README.md](README.md).

## Preferência permanente do usuário

Manter o registro de alterações e o contexto no GitHub para retomar o trabalho em outro computador. Ao terminar cada tarefa relevante, atualizar este resumo e o [HISTORICO.md](HISTORICO.md), criar um commit e enviá-lo ao remoto. Seguir o procedimento de [AGENTS.md](AGENTS.md).

## Estado confirmado nesta tarefa

- Repositório: `https://github.com/equipevivox/mockups-vivox`.
- Branch principal: `main`. A pasta de trabalho foi conectada a `origin` e passou a acompanhar `origin/main`.
- Base desta tarefa: commit `ee0e6e9`, com o portfólio centralizado e o domínio grid confirmado.
- Vercel: projeto existente `mockups-vivox`, ID `prj_gpzWlIxg6CuooSrEcKo2pTPiV6D8`, equipe `equipevivox-7341s-projects` (`team_14ydzpU22f732BVCX1lK6WA2`). A pasta está vinculada por `.vercel/project.json`, que é local e não deve ser versionado.
- Produção: `https://grid.vivoxmarketing.com.br`, com alias `https://mockups-vivox.vercel.app`. O usuário mudou o domínio personalizado; o projeto Vercel continua **mockups-vivox**.
- Integração Vercel–GitHub conectada a `equipevivox/mockups-vivox`; branch de produção `main`. Os próximos envios a essa branch devem disparar a publicação automática no mesmo projeto.
- Aplicação estática em HTML/CSS/JS, sem etapa de build; arquivos de portfólio, administração e visualizador presentes.
- Textos de abertura atualizados conforme solicitação do usuário: eyebrow **MATERIAIS VIVOX**, título **Materiais criados para sua marca** e descrição que orienta explorar os materiais, folhear páginas e comentar. Filtros mantidos como **Todos**, **Revistas**, **Folders** e **Mockups**, pois não foram enviados novos rótulos.
- Cabeçalho, filtros e metadados centralizados. Capas ampliadas para até 420px e área de galeria de até 1880px; linhas de quatro em telas a partir de 1680px, três a partir de 900px, duas a partir de 600px e uma em telas menores. Linhas com poucos materiais ficam centralizadas sem cartões de preenchimento.
- Rodapé “VIVOX · ferramenta interna de revisão de materiais” removido. Base do portfólio em preto absoluto `#000000`, com sobreposições pretas e capas decorativas preservadas. As referências dos dois estilos alterados em `index.html` têm versão na URL para evitar a reutilização de CSS anterior pelo navegador.
- Zoom do fundo ampliado pela largura da matriz, altura das capas e profundidade; o movimento continua vinculado à rolagem. A máscara agora prioriza o centro para preservar a leitura dos textos.
- A atualização dos textos foi publicada automaticamente a partir de `c1580a2`, com deployment `dpl_89UXNt3ck5xcHrEU3nXFdGSbwxRF` em estado `READY`. As rotas `/` e `/portfolio` em `mockups-vivox.vercel.app` responderam 200 com HTML idêntico ao arquivo local.
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

- O usuário esclareceu que o endereço atual é `grid.vivoxmarketing.com.br`. A API Vercel confirmou esse domínio no mesmo projeto, com `verified: true`, e o site respondeu HTTP 200. A falha anterior referia-se ao domínio antigo; não há pendência de recuperar esse endereço.
- Última inspeção visual no Edge em 2508 × 1361, 1440 × 1000 e 390 × 844: duas capas reais carregadas, cabeçalho centralizado, rodapé ausente, fundo computado `rgb(0, 0, 0)` sem gradiente na base e nenhum transbordamento horizontal ou erro de execução. As capas renderizaram com aproximadamente 391/398/323px de largura, respectivamente. O detector visual operou em modo limitado e apontou somente a fonte Inter, preservada como parte da identidade existente.
- Acesso ao repositório, histórico e rastreamento de `main` conferidos.
- A integração GitHub recusou escrita na tarefa anterior. Usar o Git local autenticado para publicar; outro computador precisa ter sua própria autenticação para enviar commits.
- Sintaxe JavaScript e diff conferidos. A visualização local foi inspecionada no Edge em desktop (1440 × 1000) e celular (390 × 844), com as duas capas reais, sem transbordamento horizontal ou erros de execução.
- Cenários de ausência de materiais, inclusão, despublicação, exclusão, falha de imagem, falha de rede, filtros e movimento reduzido verificados com respostas simuladas isoladas do banco real.
- A consulta periódica incorporou um material em 29 segundos, sem recarga ou evento de foco; a rolagem alterou a perspectiva e a posição das colunas conforme esperado.
- Nenhuma migração, alteração nas permissões do backend ou upload de teste foi realizado em produção.
- Publicação de produção concluída via CLI no projeto existente: deployment `dpl_B3NDBRje1KHsraPq3F8LtWr7U373`, estado `READY`. Confirmados os dois domínios, respostas HTTP 200 para `/`, `/portfolio`, `/admin`, `/m/REVISTA_HOSPITAL_VISAO` e os novos assets. O navegador carregou as duas revistas reais.
- Correção do diagnóstico anterior: a listagem da integração Vercel estava incompleta. A CLI e o painel encontraram o projeto na mesma conta `equipevivox-7341`; não foi necessário trocar de conta nem criar projeto.
- A conexão Vercel–GitHub foi concluída após o usuário confirmar o acesso do aplicativo no GitHub. A CLI retornou `Connected`, e a API do projeto confirmou provedor `github`, organização `equipevivox`, repositório `mockups-vivox` e branch de produção `main`.
- Fluxo automático verificado: o envio do commit `77ae404` à `main` criou o deployment `dpl_GcB5EQBF9pEJCCqSGaBZxSWuJLXq`, com origem `git`, destino `production` e estado `READY`. O registro está sincronizado no GitHub.
- `.env*` foi incluído em `.gitignore`; a vinculação da CLI pode baixar variáveis locais. Tokens e arquivos `.env` não foram enviados ao Git nem ao deploy.
- Reenvio do mesmo arquivo renova a capa por notificação entre abas do mesmo navegador e em novas visitas. Uma aba já aberta em outro computador precisa ser recarregada quando os dados do material não mudam, pois o schema atual não tem versão da capa nem `updated_at`.
- Os pontos de autenticação e permissões descritos no README são contexto herdado, não resultado de uma auditoria atual.

## Próximos passos

- Conferir o resultado do deploy da Vercel após envios à branch `main`.
- Se houver trabalho futuro de segurança, conferir a autenticação e as permissões reais do backend levando em conta a visibilidade pública do repositório.
- Em outro computador, clonar ou atualizar a branch de trabalho, abrir sua pasta no Codex e ler estes registros antes de editar.
