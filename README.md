# Junie

Protótipo de uma versão **white label** do Logico Café: cada cliente configura
a própria marca (logo, cores, fonte, estilo) e a própria operação (cardápio,
mesas, estoque) em duas jornadas de onboarding, e a equipe usa um PDV com a
identidade dele.

Projeto novo e independente. `logico` e `logico-api` não foram alterados;
a configuração base do Adonis foi copiada de `logico-api`.

```
junie/
├── api/    AdonisJS 5 + Lucid (mesma stack do logico-api). SQLite no dev, Postgres em produção
├── web/    Vue 3 + Vite + Tailwind (mesma stack do logico)
└── docs/
    └── ESTOQUE.md   diagnóstico do estoque do Logico, o que foi feito e próximos passos
```

## Rodar

### Só o front, em modo demonstração (para apresentar)

```bash
cd web
npm install
npm run dev          # http://localhost:5173
```

Sem `VITE_API_URL`, o front usa uma **API simulada no próprio navegador**
(`web/src/lib/demo/servidor.js`), com as mesmas rotas e regras da API real e os
dados no `localStorage`. Dá para publicar em Netlify/Render como site estático
(`npm run build`, pasta `dist/`, já com `_redirects`) e apresentar sem backend.

O botão **"Ver demonstração"** na tela inicial cria o "Café Aurora" com
cardápio, fichas técnicas, fornecedores, mesas ocupadas, pedidos na cozinha e
14 dias de vendas.

### Front + API real

```bash
cd api
npm install          # na 1ª vez o npm pede para liberar o build do better-sqlite3 (já está em allowScripts)
cp .env.example .env # troque APP_KEY
node ace migration:run
npm run dev          # http://localhost:3333

cd ../web
echo "VITE_API_URL=http://localhost:3333" > .env.local
npm run dev
```

Para Postgres (como o Logico no Render): `DB_CONNECTION=pg` e as variáveis
`PG_*` no `.env`. O `Procfile` já roda as migrations no deploy.

## Linguagem visual

Herdada do Logico: uma família (DIN 2014, do kit Adobe do Logico, com Barlow
de reserva), negrito, caixa-alta, **duas cores**: o chão (preto ou branco) e a
cor da marca como tinta. Palavras são botões, réguas de 4px separam, e a barra
de total é um bloco cheio de tinta, como no caixa do Logico. Os únicos
ornamentos são **círculos**: o orbe com as cores da marca (caixa do dia, mesa
ocupada, menu), as mesas redondas e os insumos como potes que enchem.

## Roteiro de demonstração para o cliente

1. **Tela inicial** → "Criar minha marca".
2. **Jornada 1: marca** (`/comecar`): uma pergunta por tela (nome, cor, logo e
   letra). A própria tela vira a marca a cada escolha; não há prévia separada.
3. **Jornada 2: operação** (`/configurar`): usar o cardápio do segmento ou
   começar em branco; **escrever o cardápio como num quadro de giz**
   ("ESPRESSO 7"); escolher o número de mesas; escrever o que tem na prateleira
   ("LEITE 12 L"). Produtos de revenda com o mesmo nome do insumo se ligam
   sozinhos.
4. **Vender**: toque nos produtos, total na barra; Cartão registra na hora,
   Pix e Dinheiro abrem tela cheia (QR com a chave do cliente, troco).
5. **Mesas e Cozinha**: mesas redondas; na cozinha, tocar no pedido o passa para
   a próxima coluna.
6. **Estoque**: uma frase resume a situação; potes mostram o nível e o mínimo;
   Comprar gera o pedido por fornecedor (WhatsApp) e "Chegou" lança a entrada.
7. **Caixa**: o orbe mostra quanto vendeu e quanto sobrou.
8. **Menu (orbe no canto)**: Cardápio, Marca (refaz o ritual da jornada 1),
   link da equipe (`/entrar/<slug>`, já com a marca do cliente).

## O que mudou em relação ao Logico

| Logico | Junie |
|---|---|
| Logins e senhas fixos no front (`Login.vue`, `Menu.vue`) | Cadastro de conta, senha com hash (scrypt) e token de API; tenant vem do usuário autenticado |
| `unidade_id` na query string, qualquer um lê qualquer unidade | Toda consulta filtrada pelo tenant do token; testado: acesso a dados de outro cliente devolve 404 |
| URL da API fixa em cada componente | `VITE_API_URL` num único cliente HTTP (`web/src/lib/api.js`) |
| Categorias fixas (`tipo` 0–3: CAFÉ, BAR, FOTO, LOJA) | Categorias do cliente, com opção "vai para a cozinha" |
| Azul `#0000ff`, logo e fonte embutidos | Tema por variáveis CSS geradas da marca, com contraste de texto calculado (WCAG) |
| Chave Pix e nome fixos na URL de um serviço externo | BR Code Pix gerado no front com a chave de cada cliente |
| `compras_mesas` + `pedidos` duplicados | `pedido_itens`: o mesmo registro é comanda e ticket da cozinha |
| Venda gravada em 1 + N requisições do navegador | Venda, itens e baixa de estoque numa transação só |
| Lucro digitado à mão | Custo pela ficha técnica e custo médio dos insumos |
| Estoque = número no item do cardápio | Insumos, ficha técnica, movimentações, alertas e sugestão de compra (ver `docs/ESTOQUE.md`) |

## Limites do protótipo

- **Nota fiscal:** o Logico emite NFC-e/NF-e por `treatments.run`; o Junie ainda não
  tem essa integração. Precisa entrar antes de uso real.
- **Fonte DIN 2014:** vem do kit Adobe Fonts do Logico (`use.typekit.net/dnn5lyy`), que só
  carrega nos domínios cadastrados no kit. Para um cliente, use licença própria ou fique com a
  Barlow, que já entra como reserva.
- **Uma unidade por marca.** Multiunidade está no roadmap (`docs/ESTOQUE.md`, item 8).
- **Logo guardada como imagem base64 no banco** (reduzida para 480 px). Em produção,
  mover para storage (S3/R2) usando o `@adonisjs/drive` que já está configurado.
- **Papéis de usuário** (`dono`, `gerente`, `atendente`) existem no modelo, mas ainda
  não restringem telas nem ações, e não há tela para convidar a equipe.
- **Modo demonstração:** os dados ficam no navegador. O link `/entrar/<slug>` só
  abre com a marca no mesmo navegador; com a API real funciona em qualquer lugar.
- Sem testes automatizados no repositório; os fluxos foram verificados de ponta a
  ponta no navegador (demo e API real) e na API por chamadas HTTP.
