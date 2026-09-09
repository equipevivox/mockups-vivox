# Contexto atual — Mockups VIVOX

Última atualização: 2026-09-09 (America/Cuiaba).

## Continuidade e produção

- Repositório público `https://github.com/equipevivox/mockups-vivox.git`. Sempre ler README, AGENTS, este resumo e HISTORICO; conferir Git/fetch antes de editar e publicar registros/commits ao concluir.
- Produção: `https://grid.vivoxmarketing.com.br`, alias `https://mockups-vivox.vercel.app`.
- Vercel: projeto existente **mockups-vivox**, ID `prj_gpzWlIxg6CuooSrEcKo2pTPiV6D8`, equipe `equipevivox-7341s-projects` (`team_14ydzpU22f732BVCX1lK6WA2`). GitHub conectado; push à `main` publica automaticamente.
- Base da integração R2: `11ca82a`, conferida com fetch/pull, sem divergência. Trabalho atual na branch **`codex/cloudflare-r2`** para preservar produção enquanto a configuração de credenciais aguarda autorização.
- Supabase compartilhado: `kthestvyzvbbpnsulned`. Metadados e comentários permanecem nele; não alterar tabelas de outras aplicações.

## Integração Cloudflare R2 — pronta localmente, ativação pendente

**Pedido:** usar o Cloudflare para arquivos a partir de agora. Não foi pedido transferir o site da Vercel nem migrar em massa arquivos antigos.

- Bucket existente **grid-files**, endpoint S3 da conta `897116310c751f22394896fed5202ebf`; base pública `https://pub-42970d75c5c14ba1bda61b8fc81c9d5d.r2.dev` em `config.js`.
- Novas páginas: `materials/{slug}/{uuid}/pages/{i}.jpg`; novos anexos: `comments/{slug}/{uuid}.{ext}`. Continuam sendo guardadas imagens renderizadas, não PDFs originais.
- Migração **`20260909034739_arquivos_no_r2.sql` aplicada**: coluna `mockups.r2_prefix`, nula para os cinco materiais existentes, e restrição vinculando a pasta ao slug. Nenhum arquivo existente foi movido/apagado. Políticas preservadas.
- `VX.materialPageUrl(material, indice)` é usado no portfólio, fundo, admin e visualizador: R2 por pasta versionada ou Supabase legado com `cover_version`.
- Cada envio recebe nova pasta. `/api/storage` confirma todas as páginas antes de atualizar os links; compara `cover_version` para recusar envios concorrentes desatualizados. Reenvio mantém nome, publicação, slug e comentários. Conclusão repetida da mesma versão é idempotente.
- Upload de PDF exige sessão de admin; senha existente verificada no servidor, cookie assinado HttpOnly, SameSite Strict, Secure em produção, válido por 12 horas. A antiga flag `sessionStorage.vivox_admin` não autentica a API. RLS permissiva e revisão por link continuam como antes; isto não é uma revisão geral da segurança do Supabase.
- URLs de PUT duram dez minutos, vinculadas à chave/tipo/tamanho. Limites: 500 páginas/PDF, 7 MB/JPEG, cinco anexos/comentário de até 10 MB em JPG/PNG/WebP/GIF.
- CORS **configurado e verificado** no painel Cloudflare para os domínios grid e alias Vercel e localhost/127.0.0.1:8130. Credencial S3 permite objetos, mas não gestão de CORS; configuração feita na sessão já autenticada do usuário. Não ampliadas permissões do token.
- Chaves somente em `.env.r2.local` ignorado e, após autorização, variáveis criptografadas da Vercel. Nunca registrar os valores. O token geral Cloudflare não é usado pela aplicação.
- **Bloqueio concreto:** revisão automática rejeitou o envio dos segredos à Vercel por exigir autorização explícita para esse destino/payload. Pergunta enviada ao usuário, ainda sem resposta ao registrar este estado. Nenhuma dessas variáveis foi enviada à Vercel, nenhum deploy de produção desta integração foi feito, e a integração continua fora da `main`.

- Commit inicial da integração: `77b5707` publicado e confirmado no GitHub. Prévia da branch: `dpl_6oMoLYv9nd3738ER3Jmt2HrMkkrf`, build **READY**, função presente; API responde 503 de configuração ausente, como esperado enquanto faltam variáveis. A interface de produção foi atualizada separadamente para `5edd3af`; o R2 continua fora de produção. Rotas `/`, `/portfolio`, `/admin` e `/m/TESTE` retornaram 200 na prévia; `.env.r2.local`, `server/auth.cjs` e `package.json` retornaram 404.

## Retomar e ativar

1. Confirmar se chegou a autorização explícita para armazenar na Vercel as chaves de acesso/secreta R2, hash da senha atual e segredo de sessão. Não considerar passagem de tempo como autorização.
2. Após autorização, configurar as seis variáveis documentadas no README no projeto existente (criptografadas): `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `ADMIN_PASSWORD_SHA256`, `SESSION_SECRET`. Arquivo privado local disponível neste computador; em outro computador usar configuração segura, nunca o Git para segredos.
3. Conferir o build da Vercel com a nova função e saída pública. Integrar a branch à `main` sem sobrescrever alterações concorrentes; publicar e verificar SHA remoto/deployment READY, `/api/storage`, rotas e ausência de arquivos privados por HTTP.
4. Atualizar este estado e o histórico com o resultado da ativação. Não declarar a integração ativa em produção antes dessa verificação.

## Desenvolvimento e limites

- Frontend HTML/CSS/JS puro, sem React ou bundler. SDK S3 em dependências de servidor com versões fixadas/lockfile.
- `npm ci`, `npm run dev`: servidor Node local com API, somente assets permitidos. `npm run build` copia esses assets para `public/`, ignorado. Não usar servidor estático genérico na raiz que possa expor `.env*`.
- Servidor local de teste usou senha/segredo exclusivos e descartáveis; não são a senha de produção. Reiniciar normalmente antes de uso real.
- Versões anteriores e envios incompletos permanecem até exclusão explícita do material; não há limpeza automática. A exclusão usa R2 API e Supabase Storage API. `r2.dev` possui limites de requisição; domínio próprio de arquivos é um possível próximo passo.
- Limites por IP são básicos e por instância; proteção global requer Firewall. Não há novos alertas do advisor da migração; avisos anteriores do projeto compartilhado permanecem fora desta tarefa.

## Verificações da integração

- **20 testes automatizados passaram**: nomes, URLs dos dois provedores, fundo/parallax, sessão, origem, assinatura, tamanho/tipo, envio incompleto, conclusão idempotente, concorrência e exclusão limitada às pastas/threads corretas.
- R2 real: PUT assinado, preflight CORS, GET público e exclusão de objeto temporário, todos confirmados.
- Edge local: PDF temporário de duas páginas enviado pelo painel ao R2, material inicialmente privado; capa carregada, ambas as páginas carregadas no visualizador, avanço 1 → 2. Comentário com imagem enviado e foto pública exibida. Reenvio preservou nome editado e publicação e alterou pasta/cover_version.
- Exclusão pelo mesmo serviço conferida: anexo passou a 404, material removido, zero arquivos dos testes nas pastas R2. Banco voltou a cinco materiais existentes com `r2_prefix` nulo; nenhum material real foi editado.
- Portfólio preservado com quatro materiais publicados, capas carregadas, teste ausente e sem transbordamento. Inspeção em desktop e 390×844. Arquivos `.env.r2.local`, `server/auth.cjs` e `package.json` retornam 404 no servidor local.

## Entrega visual incorporada da main

- Publicação confirmada em main no commit 5edd3af, deployment dpl_Cgw1kR7iom7SHNAuSUeZNhVEupZ9 em estado READY. Portfólio, painel, visualizador, favicon, estilos e scripts responderam 200 em grid.vivoxmarketing.com.br e corresponderam à versão local validada.
- Interface integrada nesta branch sem alterar a pendência de autorização do R2. Conflitos limitados ao contexto/histórico e às URLs de estilos foram resolvidos preservando a API e os scripts de upload R2.
- Favicon com o V original; quadradinhos da logo animados sutilmente com pausas, suspensão fora da tela/aba oculta e movimento reduzido. Painel/login com logo centralizada e tema claro/escuro compartilhado com a inicial; ações de 44px e miniaturas ampliadas. Novos assets ficam em assets/, já incluído na lista pública do build.
- Dez testes da versão estática e inspeção Edge em desktop/celular passaram. Após integrar nesta branch, os 20 testes passaram e o build incluiu os novos assets sem expor arquivos privados. Nenhum material real alterado nesta entrega visual.

## Interface e regras preservadas

- Logo VIVOX Grid centralizada, sem botão de admin; `/admin` direto, com logo no login/painel. Tema claro/escuro na inicial e no painel/login, preto absoluto por padrão, preferência em `vivox_theme`.
- Texto principal “Materiais criados para sua marca”, eyebrow MATERIAIS VIVOX, filtros Todos/Revistas/Folders/Mockups. Textos centralizados; revistas grandes, linhas 4/3/2/1; sem rodapé.
- Nome exibido editável até 120 caracteres, preservando slug/links. Fundo usa primeira página real dos materiais públicos, sem duplicar ou preencher com exemplos, posições estáveis e vazio em falhas; filtros só alteram cartões.
- Consulta a cada 15 segundos somente em aba visível, mais foco/conexão/avisos entre abas. Fundo mantém parallax baseado no contêiner real, movimento reduzido, aria-hidden e ausência de interação.
- turn.js: páginas com tamanho explícito e imagens carregadas antes do init; nunca display:contents no pai; pins dentro da página; disable no modo comentário. PDF worker sempre same-origin. Assets do viewer absolutos; nunca cleanUrls:true.
