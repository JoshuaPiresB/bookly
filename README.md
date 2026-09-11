# Bookly

Biblioteca pessoal full-stack para descobrir livros, organizar estantes, acompanhar leituras e manter resenhas e anotações. A aplicação usa dados reais do PostgreSQL e consulta o Google Books exclusivamente pelo backend.

## Stack

- Next.js 16 com App Router e React 19
- TypeScript em modo strict, Tailwind CSS 4 e ESLint
- PostgreSQL 17, Prisma 7 e adapter `pg`
- NextAuth/Auth.js com credenciais, JWT e bcrypt
- Zod para contratos de entrada
- Vitest para testes unitários e de integração; Playwright para E2E

As versões são exatas em `package.json` e reproduzíveis por `package-lock.json`. Overrides transitivos corrigem vulnerabilidades conhecidas no ferramental do Prisma; `npm audit --omit=dev` deve permanecer limpo.

## Executar localmente

Requisitos: Node.js 24, npm 11.19.0 e Docker Desktop/Compose. Também é possível usar um PostgreSQL 17 local.

```sh
npm ci
npm run env:init
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000), crie uma conta em `/cadastro` e entre em `/login`. Uma visita a `/` sem sessão é redirecionada para o login.

`npm run env:init` cria um `.env` local com senha do banco e segredo de autenticação aleatórios. O comando não imprime segredos nem sobrescreve um arquivo existente. Alternativamente, copie `.env.example` para `.env` e preencha os valores. Nunca versione `.env`.

O PostgreSQL do Compose expõe a porta apenas em `127.0.0.1`. Se a porta 5432 estiver ocupada, altere `POSTGRES_PORT` e a porta de `DATABASE_URL`. `docker compose down` encerra o serviço e preserva o volume; remover o volume também remove os dados.

### Variáveis de ambiente

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão PostgreSQL da aplicação |
| `DIRECT_URL` | Conexão direta opcional para migrations quando a aplicação usa pooler |
| `AUTH_SECRET` | Segredo com pelo menos 32 caracteres |
| `NEXTAUTH_URL` | Origem canônica, por exemplo `http://localhost:3000` |
| `GOOGLE_BOOKS_API_KEY` | Chave opcional, usada somente no servidor; recomendada para quota própria |
| `RESEND_API_KEY` | Chave de envio de e-mail; em desenvolvimento pode ficar vazia |
| `RESEND_FROM` | Remetente verificado, por exemplo `Bookly <contato@seu-dominio.com>` |
| `PASSWORD_RESET_TTL_MINUTES` | Validade do link de redefinição, entre 10 e 120 minutos |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` | Configuração do Compose |
| `ALLOW_DEV_SEED`, `SEED_EMAIL`, `SEED_PASSWORD` | Habilitação e credenciais do seed local |
| `TEST_DATABASE_URL` | Banco local separado cujo nome termina em `_test` |
| `PLAYWRIGHT_CHANNEL` | Opcional: `msedge` ou `chrome`; vazio usa Chromium do Playwright |

Use no navegador exatamente a origem de `NEXTAUTH_URL`: não alterne entre `localhost` e `127.0.0.1`. Cookies e proteção de origem dependem dela.

### E-mail de recuperação de senha

Em desenvolvimento, `RESEND_API_KEY` pode permanecer vazia. Ao solicitar a recuperação de uma conta existente, o link de uso único é mostrado somente no terminal onde `npm run dev` está rodando. A resposta do navegador nunca confirma se o e-mail existe.

Em produção, crie uma chave de envio no Resend, verifique o domínio do remetente e configure `RESEND_API_KEY` e `RESEND_FROM`. `NEXTAUTH_URL` deve apontar para a URL pública HTTPS, pois ela é usada para construir o link enviado. O envio utiliza a API HTTPS diretamente, timeout de 10 segundos e chave de idempotência exclusiva por solicitação.

## Banco, migrations e seed

```sh
npm run db:generate   # gera o Prisma Client
npm run db:migrate    # aplica migrations no desenvolvimento
npm run db:deploy     # aplica migrations versionadas em implantação
npm run db:studio     # abre a inspeção local do banco
```

As migrations versionadas contêm CHECKs, funções e triggers que o schema Prisma não representa. Não use `prisma db push` como substituto: novas mudanças devem gerar migrations adicionais.

O seed é opcional e bloqueado por padrão. Ele exige `NODE_ENV=development`, `ALLOW_DEV_SEED=true`, host local e banco chamado `bookly`, `bookly_dev` ou `bookly_test`.

```dotenv
ALLOW_DEV_SEED=true
SEED_EMAIL=demo@bookly.local
SEED_PASSWORD=uma-senha-local-com-10-ou-mais-caracteres
```

```sh
npm run db:seed
```

O seed cria somente uma conta de desenvolvimento e as três estantes SYSTEM. Contas existentes não são sobrescritas. Volte `ALLOW_DEV_SEED=false` após o uso.

## Arquitetura

```text
src/
  app/
    (auth)/                 # login e cadastro
    (protected)/            # páginas autenticadas
    api/                    # Route Handlers
  components/
    auth/ books/ journal/ layout/ notes/ reading/ reviews/ shelves/ ui/
  features/
    auth/ books/ dashboard/ journal/ notes/ reading/ reviews/ shelves/
  lib/                      # sessão, banco, HTTP, ambiente e erros
  types/                    # extensão tipada da sessão
prisma/
  schema.prisma
  migrations/
  seed.ts
scripts/                    # inicialização segura do ambiente e banco de testes
tests/
  unit/ integration/ e2e/
```

O fluxo principal é `Route Handler → Zod → service → Prisma → PostgreSQL`. Páginas usam Server Components por padrão; formulários, menus, busca e toasts são ilhas Client Component. A integração HTTP externa existe apenas em `src/features/books/integrations/google-books/client.ts`.

`getCurrentUser()` lê a sessão e devolve apenas o perfil público. `requireUser()` protege páginas e `requireApiUser()` protege services de API. Prisma e segredos ficam em módulos `server-only`. Nenhum endpoint aceita `userId` do navegador como fonte de ownership.

Escritas relacionadas à biblioteca bloqueiam a linha do usuário durante uma transação curta. Isso serializa operações concorrentes do mesmo usuário; HTTP externo sempre acontece antes da transação. Uniques e UPSERTs complementam a proteção contra duplicidade e race conditions.

## Modelo de dados

| Modelo | Responsabilidade e garantias |
|---|---|
| `User` | Perfil, hash da senha, e-mail normalizado/único e versão de sessão |
| `PasswordResetToken` | Hash SHA-256 do link, expiração e marca de uso; um token ativo por usuário |
| `Book` | Catálogo global; `externalId` único, ISBNs indexados e metadados opcionais |
| `Shelf` | Estante do usuário; `SYSTEM/CUSTOM`, nome normalizado único por usuário |
| `ShelfBook` | Relação N:N idempotente por chave composta `(shelfId, bookId)` |
| `ReadingState` | Estado único por usuário/livro: `WANT_TO_READ`, `READING` ou `READ` |
| `Review` | Uma por usuário/livro, nota inteira de 1 a 5 e visibilidade persistida |
| `ReadingNote` | Várias anotações privadas por usuário/livro, com página opcional |
| `AuthRateLimit` | Contagem compartilhada e atômica de tentativas de autenticação |

No cadastro, usuário e estantes **Favoritos**, **Quero ler** e **Lidos** são criados no mesmo nested write. Todas são SYSTEM. O serviço e uma trigger impedem edição de identidade e exclusão dessas estantes, permitindo apenas a cascata da exclusão da própria conta.

O banco também garante conteúdo não vazio, rating válido, páginas positivas/compatíveis com `Book.pageCount`, coerência de datas, chaves estrangeiras e unicidade dos relacionamentos. A normalização Unicode de nomes de estante ocorre no PostgreSQL 17; diferenças apenas de caixa e espaços conflitam para o mesmo usuário.

## Rotas da aplicação

| Rota | Conteúdo |
|---|---|
| `/login`, `/cadastro` | Autenticação por e-mail e senha |
| `/esqueci-senha`, `/redefinir-senha` | Solicitação do link e definição segura de uma nova senha |
| `/` | Continue lendo, estantes e duas resenhas recentes |
| `/explorar` | Busca por título, autor ou ISBN, com debounce e estados de erro/vazio |
| `/estantes` | Estantes SYSTEM e customizadas; criação, edição e exclusão permitida |
| `/estantes/[id]` | Livros da estante, ordenação, paginação, inclusão e remoção |
| `/lidos`, `/quero-ler` | Coleções derivadas do estado de leitura e das estantes de sistema |
| `/livros/[externalId]` | Detalhes, estantes, favoritos, leitura, resenha e anotações |
| `/resenhas` | Resenhas próprias com edição e exclusão |
| `/configuracoes` | Dados atuais do perfil e acesso ao logout pelo menu da conta |

Todas as páginas internas usam o layout clean do Bookly: Sidebar fixa no desktop, Topbar sem notificações, largura máxima de 1520 px, foco visível e feedback de loading/toast. Capas ausentes ou inválidas usam fallback neutro. Metadados opcionais inexistentes não são renderizados.

## API interna

Os endpoints de cadastro e recuperação de senha são públicos. Os demais exigem sessão. Todas as mutações exigem `Origin` igual a `NEXTAUTH_URL`, JSON válido e limitado, além de schemas estritos que recusam campos extras.

| Método e rota | Finalidade |
|---|---|
| `POST /api/auth/register` | Cadastro transacional com estantes padrão |
| `POST /api/auth/password/forgot` | Cria um link de uso único sem revelar se o e-mail existe |
| `POST /api/auth/password/reset` | Valida o token, troca o hash da senha e revoga sessões anteriores |
| `GET /api/me` | Perfil público da sessão |
| `GET /api/books/search?q=&mode=&limit=&offset=` | Pesquisa Google normalizada |
| `GET /api/books/[externalId]` | Detalhes locais ou do Google, sem persistir pela leitura |
| `GET/POST /api/shelves` | Listar/criar estantes próprias |
| `GET/PATCH/DELETE /api/shelves/[id]` | Consultar/editar/excluir estante própria CUSTOM |
| `GET/POST /api/shelves/[id]/books` | Listar/adicionar livros |
| `DELETE /api/shelves/[id]/books/[bookId]` | Remover vínculo, preservando histórico e livro global |
| `GET/PATCH /api/books/[externalId]/reading` | Consultar/atualizar status e página atual |
| `GET/POST /api/reviews` | Listar/criar resenhas próprias |
| `PATCH/DELETE /api/reviews/[id]` | Editar/excluir resenha própria |
| `GET/POST /api/books/[externalId]/notes` | Listar/criar anotações próprias do livro |
| `PATCH/DELETE /api/notes/[id]` | Editar/excluir anotação própria |

Listagens paginadas retornam `{ data, meta }`; demais respostas retornam `{ data }`. Recursos alheios respondem 404 sem confirmar sua existência. Conflitos retornam 409, validação 400, origem inválida 403 e falhas externas códigos/mensagens internos em português. Erros inesperados não expõem SQL, stack, payload externo ou segredos.

### Google Books

A busca aceita `mode=all|title|author|isbn`, até 40 resultados e offset máximo de 10.000. O modo `all` reconhece ISBN-10/13 com espaços ou hífens. Com `GOOGLE_BOOKS_API_KEY`, o backend usa a API Google Books v1; sem chave, usa o feed JSON público do próprio Google Books para não depender da quota compartilhada da API v1. Respostas dos dois formatos são validadas e normalizadas; JSON bruto, chave da API e campos desconhecidos nunca chegam ao cliente.

O transporte usa HTTPS, host fixo, sem redirects, timeout total de 8 segundos, corpo máximo de 2 MB e ausência de retry automático. Capa aceita apenas hosts Google permitidos e é convertida para HTTPS. HTML da descrição é convertido em texto simples. Quota, 403/429, timeout, rede, JSON inválido, volume inexistente e ausência de metadados recebem tratamento explícito.

`ensureBookExists(externalId)` consulta primeiro o catálogo local e usa UPSERT global ao persistir. Inclusões em estante, leitura, resenha e anotação garantem o livro dentro da transação da escrita pessoal. Pesquisar ou apenas abrir detalhes não grava dados.

## Regras de leitura e diário

- Adicionar em **Quero ler** cria `WANT_TO_READ` somente quando ainda não existe estado; não regride leitura iniciada ou concluída.
- Adicionar em **Lidos** cria/atualiza `READ`, registra conclusão, sincroniza a página conhecida e remove Quero ler.
- Favoritar e estantes CUSTOM não mudam o estado de leitura.
- Iniciar uma leitura remove Quero ler/Lidos, preserva Favoritos, customizadas, resenha e anotações.
- Atualizar a página não conclui o livro automaticamente; página acima do total conhecido é recusada.
- Remover de uma estante remove somente o vínculo. Livro, leitura, resenha e notas permanecem.
- Há no máximo uma resenha por usuário/livro. A marca Pública é armazenada, mas não existe feed ou endpoint público.
- Anotações são sempre privadas e sua página opcional deve ser positiva e não exceder o livro quando o total é conhecido.

## Autenticação e segurança

- Credentials + JWT do NextAuth; cookie `httpOnly`, `sameSite=lax` e `secure` sob HTTPS.
- Senhas de 10 a 72 bytes e bcrypt custo 12; e-mail normalizado e erro de duplicidade em português.
- Sessão máxima de sete dias e validação de `sessionVersion` no banco para revogação de tokens antigos.
- Rate limit de cadastro/login por identificador normalizado, compartilhado entre processos.
- Proteção contra CSRF/origem nas APIs mutáveis; o login/logout usa o mecanismo CSRF do NextAuth.
- DTOs/selects mínimos evitam enviar hash de senha ou dados de outra conta.
- Recuperação de senha armazena somente SHA-256 do token, expira o link, impede reuso e mantém resposta neutra para e-mails inexistentes.
- Seed bloqueado fora do ambiente local de desenvolvimento.

Em implantação, use HTTPS, segredo exclusivo, usuário PostgreSQL com privilégios mínimos, credenciais administrativas separadas para `db:deploy`, logs centralizados e rate limit adicional por IP na borda.

## Testes e qualidade

Validações rápidas:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

Para integração e E2E, crie um banco local exclusivo. Com o Compose padrão:

```sh
docker compose exec postgres createdb -U bookly bookly_test
```

Configure `TEST_DATABASE_URL` apontando para `bookly_test`; os scripts recusam host não local e banco cujo nome não termina em `_test`.

```sh
npm run db:test:migrate
npm run test:integration
npm exec playwright install chromium
npm run build
npm run test:e2e
```

O Playwright inicia o build de produção na porta 3001 e encerra ao concluir. A porta deve estar livre. Os testes criam e removem apenas seus próprios registros no banco de testes.

A suíte cobre cadastro/login/logout/sessão, CSRF, token adulterado e revogação; ownership; CRUD e concorrência de estantes; SYSTEM protegida; pesquisa/normalização/falhas do Google; persistência e idempotência de livros; leitura completa; CRUD/validação/privacidade de resenhas e anotações; persistência após reload; estados visuais, teclado e larguras de 1366 a 1920 px. Mocks existem somente nas bordas determinísticas dos testes, nunca em fluxos de produto.

Para simular a aplicação de produção:

```sh
npm run build
npm start
```

## Estado final e limitações conhecidas

O escopo funcional definido para o Bookly está concluído. Não foram adicionados dashboard alternativo, recomendações, publicidade, notificações, feed social ou formulários de perfil/senha.

A busca ao vivo depende da disponibilidade do Google Books. Sem `GOOGLE_BOOKS_API_KEY`, o backend usa o feed público de compatibilidade, que pode oferecer menos metadados; para produção, configure uma chave própria para usar a API v1 e sua quota dedicada. Em falhas do provedor, a interface preserva o restante da aplicação, mostra uma mensagem clara e permite tentar novamente.
