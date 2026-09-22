# Estoque: do Logico ao Junie

Este documento registra o que foi encontrado no controle de estoque do Logico
(`logico` + `logico-api`), o que o Junie já resolve e o que vale fazer depois.
Nenhum arquivo dos projetos Logico foi alterado.

## 1. Como o estoque funciona hoje no Logico

| Ponto | Onde | Consequência |
|---|---|---|
| O estoque é um campo `estoque` (string) no próprio item do cardápio | `logico-api/database/migrations/1681648334566_alter_menus.ts` | Não existe matéria-prima. Um cappuccino não consome café nem leite; só "cappuccino" tem saldo. |
| A baixa acontece em `item_compra`, que **apaga e reinsere** o item e sempre subtrai de novo | `logico-api/app/Controllers/Http/ComprasController.ts` (`item_compra`) | Se o mesmo item for reenviado (retentativa, clique duplo), o estoque é descontado duas vezes. |
| A baixa lê o saldo, subtrai no Node e salva | mesmo método | Duas vendas simultâneas podem sobrescrever o saldo uma da outra. |
| A venda é gravada em 1 + N requisições soltas do navegador | `logico/src/components/Home.vue` (`newCompra`) | Se uma requisição falhar, a venda fica registrada sem os itens ou sem a baixa. |
| Excluir item de venda (`item_delete`) ou venda não devolve nada ao estoque | `ComprasController.destroy` / `item_delete` | O saldo diverge da realidade a cada correção. |
| "Valor do estoque" = `preço de venda × estoque` | `logico/src/components/Estoque.vue` | Superestima o patrimônio (usa preço, não custo). |
| O lucro é digitado à mão por item (`lucro`) | `Menu.vue` | Não acompanha a variação de custo dos insumos. |
| Edição de saldo sobrescreve o número, sem histórico | `Estoque.vue` → `PUT /menu/:id` | Não há como saber quem mudou, quando, nem por quê (perda? contagem? erro?). |
| Sem estoque mínimo, fornecedor ou alerta | — | A falta é descoberta quando o produto acaba. |
| Pedidos de mesa não baixam estoque até o pagamento | `MesasController.addItem` | O consumo aparece com atraso; mesas abandonadas nunca baixam. |

## 2. O que o Junie já implementa

**Modelo de dados** (`api/database/migrations`)

- **Insumos** separados dos produtos, com unidade (`un`, `g`, `kg`, `ml`, `l`), saldo, estoque mínimo, custo e fornecedor.
- **Ficha técnica** (`ficha_tecnica`): cada produto declara quanto consome de cada insumo. Produtos de revenda (água, lata) viram 1 para 1 com um clique no onboarding.
- **Movimentações** (`movimentacoes_estoque`): livro-razão com tipo (`entrada`, `venda`, `perda`, `ajuste`, `estorno`), quantidade, custo, saldo depois, motivo, usuário e venda. O saldo nunca é editado direto.
- **Fornecedores** com prazo de entrega em dias.

**Regras** (`api/app/Services/EstoqueService.ts`)

- **Baixa automática pela ficha técnica** na mesma transação da venda (`VendaService.registrar`). Se algo falhar, nada é gravado.
- **Incremento atômico no banco** (`increment`), sem ler e reescrever o saldo.
- **Custo médio ponderado** a cada entrada: a compra nova dilui o custo do que já estava na prateleira.
- **Estorno** automático ao cancelar uma venda.
- **Custo e margem reais por produto**, calculados pela ficha × custo médio atual. O lucro dos relatórios usa o custo gravado em cada venda.
- **Painel de estoque** (`GET /estoque/visao`) por insumo:
  - consumo médio diário (últimos 14 dias de vendas líquidas de estornos);
  - **cobertura em dias** (saldo ÷ consumo);
  - **ponto de pedido** = maior entre o mínimo e consumo × prazo do fornecedor;
  - **status**: em dia, repor em breve, crítico (abaixo de metade do mínimo ou acaba antes da entrega), zerado;
  - **sugestão de compra** = consumo × (prazo + 7 dias de segurança), no mínimo 2× o estoque mínimo, arredondada para lotes práticos (ex.: 29.132 ml → 30 L).
- **Inventário** (`POST /estoque/inventario`): a pessoa digita a contagem física e o sistema lança só as diferenças, com o impacto em R$.
- **Perdas** com motivo obrigatório; somadas em "perdas em 30 dias".

**Na interface** (`web/src/views/app/Estoque.vue`)

- Indicadores: valor em estoque a custo, itens em alerta, reposição sugerida (R$), perdas em 30 dias.
- Medidor de saldo por insumo com marca do mínimo.
- **Lista de compras agrupada por fornecedor**, com "Copiar pedido" e "WhatsApp" já com o texto pronto, e botão "Recebi" que lança a entrada com a quantidade sugerida.
- Histórico filtrável, inventário com diferenças ao vivo, cadastro de fornecedores.
- Depois de cada venda no PDV, um aviso quando algum insumo **acabou de entrar** em alerta.
- Selo no menu "Estoque" com o número de itens em alerta.

## 3. Próximos passos sugeridos (não implementados)

Em ordem de impacto para uma operação de café/bar:

1. **Validade e lotes (FEFO).** Entrada com data de validade; o sistema consome primeiro o que vence antes e avisa 3 dias antes do vencimento. Perecíveis (leite, frios, frutas) são a maior fonte de perda.
2. **Fator de rendimento na ficha técnica.** 1 kg de laranja rende ~400 ml de suco; 1 kg de carne crua vira ~650 g pronta. Sem isso o custo fica subestimado.
3. **Unidade de compra × unidade de uso.** Comprar "caixa com 12 L" ou "fardo com 12 latas" e consumir em ml/un, com conversão automática na entrada e na lista de compras.
4. **Entrada por XML da NF-e.** Importar a nota do fornecedor, casar os itens com os insumos e lançar entradas e custos de uma vez.
5. **CMV teórico × real.** Comparar o que a ficha técnica diz que foi consumido com o que o inventário mostra. A diferença é desperdício, porção fora do padrão ou desvio, e é o indicador que mais interessa ao dono.
6. **Contagem cíclica por curva ABC.** Contar toda semana os 20% de insumos que representam 80% do valor, e o resto por mês, em vez de inventário completo.
7. **Produção interna / sub-receitas.** Calda, massa, cold brew: um insumo produzido na casa, com ficha própria, que baixa os ingredientes quando é produzido.
8. **Multiunidade e transferências.** O Logico já opera duas unidades (Vila Buarque e Wisard). Estoque por unidade, com transferência entre lojas e visão consolidada.
9. **Item esgotado no PDV.** Quando o insumo zera, o produto aparece esgotado para o atendente (hoje o Junie avisa, mas deixa vender).
10. **Previsão por dia da semana.** Consumo de sábado é diferente de terça; a sugestão de compra pode usar a média do mesmo dia da semana.
11. **Permissões.** Só gerente/dono lança ajuste e perda; o atendente só vende. O `user_id` já é gravado em cada movimentação.
12. **Momento da baixa configurável.** Baixar no pedido (mais preciso para a cozinha) ou no pagamento (hoje, igual ao Logico).
