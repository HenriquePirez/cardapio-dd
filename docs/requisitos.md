# Requisitos — MyShelf

Documento consolidado dos requisitos funcionais e não-funcionais do sistema MyShelf (antigo Cardápio DD), organizado por área do produto.

## 1. Público — Cardápio

### 1.1. Acesso e navegação

- **Visitar cardápio**: Acesso público sem autenticação.
  - URL raiz `/` exibe cardápio da loja padrão ( `lojas.padrao = 1` ).
  - Outras lojas: `/loja/<slug>` (ex: `/loja/dona-dora-timoteo`).
  - Cache na edge: `Cache-Control` 30s; alterações aparecem em ~30s.
- **Tema claro/escuro**: Toggle no header; preferência salva em `localStorage` (`dd-tema`).
- **Idioma**: Toggle pt/en no header; preferência salva em `localStorage` (`dd-idioma`).
- **Tradução**: Interface (menus, botões, avisos) traduzida para pt e en; nomes de categorias e produtos mantidos como cadastrados.

### 1.2. Cardápio e produtos

- **Listagem por categoria**: Grid de cards de produto por categoria.
- **Card do produto**: Foto, nome, preço, CTA "Comprar", eventual badge "destaque".
- **Lightbox/seek de mídia**: Clicar na foto abre lightbox; vídeo tem seek controlado por header `Range` (206).
- **Mídia**: Fotos (imagem) e vídeos (corpo bruto no KV `MEDIA`, servidos por `/media/<chave>`).
- **Galeria**: Múltiplas fotos por produto; vídeos têm poster automático (first frame ou capta.frame).

### 1.3. Compra

- **Modalidades**:
  - `retirada`: Botão "Comprar" leva ao `comprar_url` (abre nova aba). Confirma que continua no app externo.
  - `local`: Aviso de que pedido no local é feito no totem; não exige `comprar_url`.
  - `ambos`: Ao tocar "Comprar", pergunta "comer no local ou retirada?".
- **Validação de compra**:
  - `comprar_url` vazio, inválido ou de domínio de exemplo (`donadora.com.br` como placeholder) → compra externa desabilitada; apenas local disponível.
  - Link externo aberto após confirmação do usuário.
- **CTA "Comprar"**: Estilo padrao --btn-primario (amarelo MyShelf #f9df8e, texto #39282c); hover #f5d367.

### 1.4. Busca e filtros (painel lojista)

- Filtrar produtos por disponibilidade, modalidade, categoria.
- Busca por nome do produto.
- Estados de vazio: "Nenhum produto ainda. Cadastre o primeiro →" / "Nenhum produto encontrado com esses critérios."

---

## 2. Painel Administrativo

### 2.1. Autenticação e acesso

- **Conta única**: Uma conta por dono, compartilhada com até 2 pessoas de confiança.
  - Primeira criação em `/admin/criar-conta` (nome, e-mail, senha mínima 10 caracteres).
  - Login em `/admin/login` (split-screen).
- **Rate-limit**: 5 falhas consecutivas → bloqueio de 10 minutos (tabela `login_tentativas` em D1).
- **Sessão**: Armazenada em KV `SESSION`; regenerada ao trocar e-mail.
- **Proteção de escrita**: APIs `/admin/api/*` exigem sessão (GET sem sessão → redirect) e CSRF same-origin.
- **Master vs Loja**: 
  - Usuário `master` (único no topo) vê apenas **Painel** e **Perfil** na navbar.
  - Master não tem loja própria e não acessa painel de loja (rotas de escrita → 403; GET → 302 `/admin`).
  - Usuário de loja enxuta vê navbar completa (Produtos, Categorias, Loja, Usuários).

### 2.2. Usuários

- **Listagem** (`/admin`): Tabela com busca nome/e-mail, filtro Ativos/Inativos, coluna "Papel" (Master/Loja).
- **Desativar usuário**: 
  - Confirmação "Deseja desativar esse usuário?" (dialog `confirm()`).
  - Envio best-effort de e-mail para quem foi desativado e para quem desativou.
  - Se o e-mail não estiver disponível, o envio é silencioso (não trava rate-limit).
- **Estados**: Ativo (badge `#ecf5ee` / texto `#15803d`) / Inativo (badge `#fbeaea` / texto `#b91c1c`).

### 2.3. Categorias (por loja)

- **CRUD**: Criar, renomear (com emoji), reordenar, excluir.
- **Interface**: Lista com input de renomeio e arrastar-para-reordenar.

### 2.4. Produtos (por loja)

- **Formulário** (`/admin/produtos/novo` / editar):
  - Campos: nome, preço (em reais, convertido para centavos no banco), categoria, destaque (0/1), modalidade (local/retirada/ambos), descrição, galeria (upload foto otimizada no navegador ou vídeo bruto).
  - `accent-color: var(--cor-preco)` nos inputs type=color.
  - Barra de progresso circular com `linear-gradient` em `var(--cor-preco)`.
  - Estados: hover, focus, disabled.
- **Estados de lista**:
  - "Nenhum produto ainda. Cadastre o primeiro →" (com link para criar).
  - "Nenhum produto encontrado com esses critérios."
- **Preço**: Armazenado em `preco_centavos` (INTEGER, ≥ 0). Exibição em `formatarPreco()` (reais com 2 casas).

### 2.5. Loja (branding e configurações)

- **Configurações** (`/admin/loja`):
  - Nome, slogan, descrição.
  - Logo: upload → KV `MEDIA`; chave armazenada em `logo_chave`.
  - Duas cores livres: `cor_marca` e `cor_acento` (hex). O sistema deriva tons de contraste automaticamente via `src/lib/cores.ts`.
  - Tema padrão: `'claro'` | `'escuro'`.
  - Idioma padrão: `'pt'` | `'en'`.
- **Criar nova loja**: Na tela de configurações; cada loja tem seu próprio `loja_id`, categorias, produtos, mídia, branding.
- **Seletor de loja no painel**: Cookie `loja_ativa`; altera todas as queries para o `loja_id` selecionado.

### 2.6. Perfil do usuário

- **Dados**: Nome, e-mail de login.
- **Alterar senha**: 
  - Exige senha atual + nova senha + confirmação de nova senha.
  - Sucesso → `/admin/login?ok=redefinida`.
- **Alterar e-mail**: 
  - Valida unicidade do novo e-mail.
  - Sessão regenra após alteração.
- **Redefinir senha** (esqueci a senha):
  - Do login: link "Esqueci a senha" → `/admin/recuperar-senha` (recebe token da URL).
  - Sistema envia e-mail (Resend) com link de uso único, validade 1 hora, para `/admin/redefinir-senha?token=`.
  - Página pede senha antiga + nova + confirmação.
  - Só um link pendente por usuário (novo INSERT apaga anteriores).
  - Sucesso → `/admin/login?ok=redefinida`.

### 2.7. Estatísticas (painel master)

- Cards no topo do dashboard:
  - Total de lojas.
  - Total de produtos.
  - Total de usuários.
  - (Opcional) Faturamento/visitas (dados agregados ou placeholder).
- Responsivo: 4 colunas desktop, 2 colunas mobile.

---

## 3. Requisitos Não-Funcionais

### 3.1. Desempenho

- Cache da edge 30s apenas para GET públicos (`/` e `/loja/*`).
- Nenhum bloqueio de CPU em mídia: upload foto via multipart (mais barato que multipart unificado); vídeo como corpo bruto.
- PBKDF2 40k iterações + pepper (workerd ~12 ms por verificação).
- Rate-limit em D1 (5 falhas → 10 min) — não afeta banco de leitura.

### 3.2. Segurança

- Autenticação: PBKDF2-SHA256 com pepper em secret do Worker; never em texto puro.
- Rate-limit D1 evita força bruta.
- CSRF em escritas admin (same-origin).
- Sessão em KV `SESSION`; regenerada ao trocar e-mail.
- E-mail via Resend HTTP puro; domínio `myshelf.app.br` verificado.
- Sem segredos no código: `AUTH_PEPPER`, `SETUP_TOKEN`, `RESEND_API_KEY` em `.dev.vars` / secrets do Worker.

### 3.3. Responsividade

- Cardápio: 1 coluna < 640px; 2-4 colunas ≥ 560px e ≥ 900px (grid implícito).
- Painel: 1 coluna < 640px; 2 colunas ≥ 560px; navbar wrapping sem `overflow hidden`.
- Tema/idioma persistem por `localStorage`.

### 3.4. Acessibilidade

- Foco visível (`:focus-visible`) em todos os inputs e botões.
- Contraste adequado nas paletas clara e escura.
- `aria-label` em toggle de senha, botões de ação, navegação.
- `data-i18n` em elementos traduzidos.
- Sem gradientes/neon/glassmorphism que comprometam contraste.

### 3.5. Browser / Dispositivo

- Suportado: Chrome, Edge, Firefox, Safari nas versões atuais.
- Mobile: viewport `width=device-width`; grid adapta a 1-4 colunas.
- Video seek via `Range` header (206) — suportado em todos os browsers modernos.

### 3.6. Manutenção e evolução

- Migrações SQL explícitas em `migrations/`; aplicar manualmente (`wrangler d1 execute`).
- Nunca em build/request automático.
- Design system normativo em `DESIGN.md`; tokens únicos (`src/styles/global.css`).
- Qualquer nova paleta ou token deve ser adicionada ao `DESIGN.md` e ao sidecar `.impeccable/design.json`.
- Documentos de decisão em `docs/architecture.md`; atualizar quando mudanças estruturais ocorrerem.

---

*Consolidado a partir de PRODUCT.md, docs/architecture.md, DESIGN.md, migrações SQL e código fonte observado.*