# Contexto atual — Mockups VIVOX

Última atualização: 2026-09-09 (America/Cuiaba).

## Continuidade e produção

- Repositório público `https://github.com/equipevivox/mockups-vivox.git`. Ler README, AGENTS, este resumo e HISTORICO; conferir Git/fetch, preservar alterações locais e publicar registros/commits ao concluir cada tarefa.
- Produção: `https://grid.vivoxmarketing.com.br`, alias `https://mockups-vivox.vercel.app`. Vercel: projeto existente **mockups-vivox**, ID `prj_gpzWlIxg6CuooSrEcKo2pTPiV6D8`, equipe `equipevivox-7341s-projects` (`team_14ydzpU22f732BVCX1lK6WA2`). Push à `main` publica automaticamente; conferir deployment e SHA após cada envio.
- Esta entrega visual partiu de `origin/main` em `11ca82a`, na branch `codex/painel-visual`, para não depender da ativação do R2. Frontend HTML/CSS/JS puro; não introduzir React ou bundler para efeitos visuais.
- Supabase compartilhado `kthestvyzvbbpnsulned`: metadados, comentários e arquivos legados. Não alterar dados de outras aplicações.

## Interface atual

- Portfólio e painel/login compartilham temas e preferência `vivox_theme`: escuro padrão, preto absoluto `#000000`; claro `#faf9f6`, letras escuras e dourado. Aplicação antes dos estilos e sincronização entre abas. O visualizador conserva seu tema original.
- Logo VIVOX Grid centralizada no topo público e do admin, botão de tema no canto. Home sem botão de admin; acesso direto por `/admin`. Painel com superfícies neutras, miniaturas maiores e ações responsivas de 44px.
- `assets/identity.css` reúne paleta compartilhada, estilo do painel e movimento. `assets/brand.js` aprimora apenas as logos locais, com gradientes isolados por instância e quatro quadrados animados; o desenho original permanece como alternativa. Breve onda a cada oito segundos, pausa fora da tela e com aba oculta; sem animação quando o sistema pede movimento reduzido.
- Ícone original enviado em `assets/vivox-icon.svg`; `assets/favicon.svg` reenquadra o mesmo desenho para a guia do navegador, estático, nas três páginas.
- Textos: **MATERIAIS VIVOX**, **Materiais criados para sua marca**, descrição sobre explorar, folhear e comentar. Filtros Todos/Revistas/Folders/Mockups. Textos e cartões centralizados; capas até 420px, linhas 4/3/2/1. Sem rodapé de ferramenta interna.
- Fundo com a primeira página dos materiais públicos, sem duplicações/exemplos. Posições estáveis, falhas e posições livres vazias. Parallax segue o contêiner real, colunas em sentidos opostos, sem interação e com movimento reduzido. Consulta a cada 15 segundos só em aba visível, além de foco/conexão e `VX.notifyMaterialsChanged(id)`; filtros afetam somente cartões.
- Nome exibido editável até 120 caracteres; renomear preserva slug, páginas, comentários e publicação. Reenvio preserva nome editado/publicação. `cover_version` vem do banco, renovado após envio das páginas; não invalidar capas ao apenas renomear/publicar.

## Verificações da entrega visual

- Dez testes existentes passaram; sintaxe dos scripts e diff conferidos. Detector visual limitado apontou apenas Inter, preservada conforme a identidade VIVOX.
- Edge: painel, login e home em desktop 1440×1000 e celular 390×844/320×740, dois temas, persistência após recarga, logo centralizada e nenhum transbordamento horizontal. Formulário de renomear aberto e cancelado sem gravar dados.
- Animação avança somente quando visível, pausa ao rolar e ao simular aba oculta, retoma ao voltar e fica ausente sob movimento reduzido nativo. Favicon HTTP 200, MIME SVG. Nenhum material/comentário real foi alterado.
- Modelo de autenticação e políticas herdadas não alterados nesta entrega. Regras de turn.js, PDF worker local, pins dentro das páginas e assets absolutos do viewer continuam em AGENTS; nunca habilitar `cleanUrls:true`.

## R2 continua pendente

- Integração pronta e testada na branch **`codex/cloudflare-r2`**, commits iniciais `77b5707` e `7434e66`; consultar o README e contexto dessa branch para detalhes. Migração nullable `r2_prefix` já aplicada; cinco materiais existentes continuam no Supabase, sem migração de arquivos.
- A revisão automática rejeitou salvar os segredos de servidor na Vercel por exigir autorização explícita para esse destino/payload. Pergunta ao usuário ainda pendente. Nenhuma variável secreta dessa integração foi enviada à Vercel, e a integração não está em produção.
- O pedido visual não autoriza esse envio. Após autorização explícita, configurar as variáveis criptografadas no projeto existente, integrar a branch preservando esta interface e validar produção. Nunca registrar segredos em Git/docs/arquivos públicos nem servir uma raiz que contenha `.env*` com servidor estático genérico.

## Retomada

Atualizar a branch correta, ler os registros e conferir estado real. Após publicar, verificar o SHA remoto e o deployment READY. A continuidade usa os arquivos no GitHub, sem depender da conversa de outro computador.
