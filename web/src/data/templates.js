/**
 * Modelos de operação oferecidos no onboarding. O payload vai direto para
 * POST /setup/importar (mesmo formato na API real e na demo).
 *
 * As quantidades iniciais foram pensadas para a demonstração: alguns insumos
 * já começam abaixo do mínimo para o painel de estoque ter o que mostrar.
 */

const cafeteria = {
  id: 'cafeteria',
  nome: 'Cafeteria',
  descricao: 'Cafés, comidinhas e bebidas. Com ficha técnica de cada bebida.',
  fornecedores: [
    { nome: 'Torrefação Serra Alta', telefone: '(11) 98888-1200', prazoEntregaDias: 3 },
    { nome: 'Laticínios Bom Pasto', telefone: '(11) 97777-3400', prazoEntregaDias: 1 },
    { nome: 'Distribuidora Central', telefone: '(11) 3222-5500', prazoEntregaDias: 2 },
    { nome: 'Padaria Parceira', telefone: '(11) 96666-7800', prazoEntregaDias: 1 },
  ],
  insumos: [
    { nome: 'Café em grão', unidade: 'g', quantidade: 3200, estoqueMinimo: 2000, custoUnitario: 0.11, fornecedor: 'Torrefação Serra Alta' },
    { nome: 'Leite integral', unidade: 'ml', quantidade: 7000, estoqueMinimo: 8000, custoUnitario: 0.0055, fornecedor: 'Laticínios Bom Pasto' },
    { nome: 'Bebida vegetal de aveia', unidade: 'ml', quantidade: 3000, estoqueMinimo: 2000, custoUnitario: 0.014, fornecedor: 'Laticínios Bom Pasto' },
    { nome: 'Chocolate em pó', unidade: 'g', quantidade: 900, estoqueMinimo: 500, custoUnitario: 0.06, fornecedor: 'Distribuidora Central' },
    { nome: 'Copo 300 ml', unidade: 'un', quantidade: 40, estoqueMinimo: 150, custoUnitario: 0.35, fornecedor: 'Distribuidora Central' },
    { nome: 'Tampa de copo', unidade: 'un', quantidade: 180, estoqueMinimo: 150, custoUnitario: 0.12, fornecedor: 'Distribuidora Central' },
    { nome: 'Pão de queijo congelado', unidade: 'un', quantidade: 120, estoqueMinimo: 60, custoUnitario: 0.9, fornecedor: 'Padaria Parceira' },
    { nome: 'Croissant', unidade: 'un', quantidade: 9, estoqueMinimo: 12, custoUnitario: 3.2, fornecedor: 'Padaria Parceira' },
    { nome: 'Bolo (fatia)', unidade: 'un', quantidade: 18, estoqueMinimo: 10, custoUnitario: 2.8, fornecedor: 'Padaria Parceira' },
    { nome: 'Pão de forma (fatia)', unidade: 'un', quantidade: 60, estoqueMinimo: 30, custoUnitario: 0.35, fornecedor: 'Padaria Parceira' },
    { nome: 'Queijo muçarela', unidade: 'g', quantidade: 1500, estoqueMinimo: 800, custoUnitario: 0.055, fornecedor: 'Laticínios Bom Pasto' },
    { nome: 'Presunto', unidade: 'g', quantidade: 1300, estoqueMinimo: 800, custoUnitario: 0.045, fornecedor: 'Laticínios Bom Pasto' },
    { nome: 'Laranja para suco', unidade: 'ml', quantidade: 5000, estoqueMinimo: 3000, custoUnitario: 0.009, fornecedor: 'Distribuidora Central' },
    { nome: 'Água mineral 500 ml', unidade: 'un', quantidade: 48, estoqueMinimo: 24, custoUnitario: 1.1, fornecedor: 'Distribuidora Central' },
    { nome: 'Refrigerante lata', unidade: 'un', quantidade: 0, estoqueMinimo: 24, custoUnitario: 2.4, fornecedor: 'Distribuidora Central' },
  ],
  categorias: [
    {
      nome: 'Cafés',
      enviaCozinha: true,
      produtos: [
        { nome: 'Espresso', preco: 7, ficha: [{ insumo: 'Café em grão', quantidade: 9 }] },
        { nome: 'Cappuccino', preco: 14, ficha: [{ insumo: 'Café em grão', quantidade: 18 }, { insumo: 'Leite integral', quantidade: 150 }, { insumo: 'Chocolate em pó', quantidade: 3 }] },
        { nome: 'Latte', preco: 15, ficha: [{ insumo: 'Café em grão', quantidade: 18 }, { insumo: 'Leite integral', quantidade: 220 }] },
        { nome: 'Espresso duplo', preco: 11, ficha: [{ insumo: 'Café em grão', quantidade: 18 }] },
        { nome: 'Latte de aveia', preco: 18, ficha: [{ insumo: 'Café em grão', quantidade: 18 }, { insumo: 'Bebida vegetal de aveia', quantidade: 220 }] },
        { nome: 'Mocha', preco: 17, ficha: [{ insumo: 'Café em grão', quantidade: 18 }, { insumo: 'Leite integral', quantidade: 180 }, { insumo: 'Chocolate em pó', quantidade: 20 }] },
        { nome: 'Chocolate quente', preco: 14, ficha: [{ insumo: 'Leite integral', quantidade: 220 }, { insumo: 'Chocolate em pó', quantidade: 30 }] },
      ],
    },
    {
      nome: 'Comidas',
      enviaCozinha: true,
      produtos: [
        { nome: 'Pão de queijo (3 un)', preco: 12, ficha: [{ insumo: 'Pão de queijo congelado', quantidade: 3 }] },
        { nome: 'Misto quente', preco: 19, ficha: [{ insumo: 'Pão de forma (fatia)', quantidade: 2 }, { insumo: 'Queijo muçarela', quantidade: 40 }, { insumo: 'Presunto', quantidade: 40 }] },
        { nome: 'Croissant', preco: 13, ficha: [{ insumo: 'Croissant', quantidade: 1 }] },
        { nome: 'Bolo do dia', preco: 12, ficha: [{ insumo: 'Bolo (fatia)', quantidade: 1 }] },
      ],
    },
    {
      nome: 'Bebidas',
      enviaCozinha: false,
      produtos: [
        { nome: 'Água mineral', preco: 5, ficha: [{ insumo: 'Água mineral 500 ml', quantidade: 1 }] },
        { nome: 'Suco de laranja', preco: 12, ficha: [{ insumo: 'Laranja para suco', quantidade: 300 }, { insumo: 'Copo 300 ml', quantidade: 1 }, { insumo: 'Tampa de copo', quantidade: 1 }] },
        { nome: 'Iced latte', preco: 17, ficha: [{ insumo: 'Café em grão', quantidade: 18 }, { insumo: 'Leite integral', quantidade: 200 }, { insumo: 'Copo 300 ml', quantidade: 1 }, { insumo: 'Tampa de copo', quantidade: 1 }] },
        { nome: 'Refrigerante', preco: 7, ficha: [{ insumo: 'Refrigerante lata', quantidade: 1 }] },
      ],
    },
  ],
  mesas: 10,
}

const bar = {
  id: 'bar',
  nome: 'Bar',
  descricao: 'Chopp, drinks e porções. Controle de destilados por dose.',
  fornecedores: [
    { nome: 'Cervejaria Artesanal Norte', prazoEntregaDias: 2 },
    { nome: 'Adega Distribuidora', prazoEntregaDias: 3 },
    { nome: 'Hortifruti da Esquina', prazoEntregaDias: 1 },
  ],
  insumos: [
    { nome: 'Chopp (barril)', unidade: 'ml', quantidade: 30000, estoqueMinimo: 20000, custoUnitario: 0.016, fornecedor: 'Cervejaria Artesanal Norte' },
    { nome: 'Cerveja long neck', unidade: 'un', quantidade: 36, estoqueMinimo: 48, custoUnitario: 4.2, fornecedor: 'Adega Distribuidora' },
    { nome: 'Cachaça', unidade: 'ml', quantidade: 2800, estoqueMinimo: 1500, custoUnitario: 0.04, fornecedor: 'Adega Distribuidora' },
    { nome: 'Gin', unidade: 'ml', quantidade: 900, estoqueMinimo: 1000, custoUnitario: 0.12, fornecedor: 'Adega Distribuidora' },
    { nome: 'Água tônica', unidade: 'un', quantidade: 30, estoqueMinimo: 24, custoUnitario: 2.9, fornecedor: 'Adega Distribuidora' },
    { nome: 'Limão', unidade: 'un', quantidade: 80, estoqueMinimo: 40, custoUnitario: 0.5, fornecedor: 'Hortifruti da Esquina' },
    { nome: 'Açúcar', unidade: 'g', quantidade: 3000, estoqueMinimo: 1000, custoUnitario: 0.005, fornecedor: 'Adega Distribuidora' },
    { nome: 'Batata congelada', unidade: 'g', quantidade: 6000, estoqueMinimo: 4000, custoUnitario: 0.018, fornecedor: 'Adega Distribuidora' },
    { nome: 'Gelo', unidade: 'kg', quantidade: 20, estoqueMinimo: 10, custoUnitario: 1.5, fornecedor: 'Hortifruti da Esquina' },
  ],
  categorias: [
    {
      nome: 'Cervejas',
      enviaCozinha: false,
      produtos: [
        { nome: 'Chopp 300 ml', preco: 12, ficha: [{ insumo: 'Chopp (barril)', quantidade: 300 }] },
        { nome: 'Chopp 500 ml', preco: 18, ficha: [{ insumo: 'Chopp (barril)', quantidade: 500 }] },
        { nome: 'Long neck', preco: 14, ficha: [{ insumo: 'Cerveja long neck', quantidade: 1 }] },
      ],
    },
    {
      nome: 'Drinks',
      enviaCozinha: true,
      produtos: [
        { nome: 'Caipirinha', preco: 24, ficha: [{ insumo: 'Cachaça', quantidade: 60 }, { insumo: 'Limão', quantidade: 1 }, { insumo: 'Açúcar', quantidade: 25 }, { insumo: 'Gelo', quantidade: 0.2 }] },
        { nome: 'Gin tônica', preco: 32, ficha: [{ insumo: 'Gin', quantidade: 50 }, { insumo: 'Água tônica', quantidade: 1 }, { insumo: 'Limão', quantidade: 0.5 }, { insumo: 'Gelo', quantidade: 0.2 }] },
      ],
    },
    {
      nome: 'Porções',
      enviaCozinha: true,
      produtos: [{ nome: 'Batata frita', preco: 32, ficha: [{ insumo: 'Batata congelada', quantidade: 400 }] }],
    },
  ],
  mesas: 15,
}

const restaurante = {
  id: 'restaurante',
  nome: 'Restaurante',
  descricao: 'Pratos executivos, saladas e sobremesas. Ideal para almoço.',
  fornecedores: [
    { nome: 'Açougue Central', prazoEntregaDias: 1 },
    { nome: 'Atacado Grãos', prazoEntregaDias: 3 },
    { nome: 'Hortifruti', prazoEntregaDias: 1 },
  ],
  insumos: [
    { nome: 'Arroz', unidade: 'g', quantidade: 15000, estoqueMinimo: 8000, custoUnitario: 0.006, fornecedor: 'Atacado Grãos' },
    { nome: 'Feijão', unidade: 'g', quantidade: 6000, estoqueMinimo: 5000, custoUnitario: 0.009, fornecedor: 'Atacado Grãos' },
    { nome: 'Frango (filé)', unidade: 'g', quantidade: 5000, estoqueMinimo: 6000, custoUnitario: 0.022, fornecedor: 'Açougue Central' },
    { nome: 'Carne bovina', unidade: 'g', quantidade: 7000, estoqueMinimo: 5000, custoUnitario: 0.045, fornecedor: 'Açougue Central' },
    { nome: 'Folhas para salada', unidade: 'g', quantidade: 2500, estoqueMinimo: 1500, custoUnitario: 0.03, fornecedor: 'Hortifruti' },
    { nome: 'Pudim (porção)', unidade: 'un', quantidade: 16, estoqueMinimo: 10, custoUnitario: 3.5, fornecedor: 'Hortifruti' },
    { nome: 'Refrigerante lata', unidade: 'un', quantidade: 40, estoqueMinimo: 24, custoUnitario: 2.4, fornecedor: 'Atacado Grãos' },
  ],
  categorias: [
    {
      nome: 'Pratos',
      enviaCozinha: true,
      produtos: [
        { nome: 'Executivo de frango', preco: 34, ficha: [{ insumo: 'Arroz', quantidade: 150 }, { insumo: 'Feijão', quantidade: 100 }, { insumo: 'Frango (filé)', quantidade: 180 }] },
        { nome: 'Executivo de carne', preco: 39, ficha: [{ insumo: 'Arroz', quantidade: 150 }, { insumo: 'Feijão', quantidade: 100 }, { insumo: 'Carne bovina', quantidade: 180 }] },
        { nome: 'Salada da casa', preco: 28, ficha: [{ insumo: 'Folhas para salada', quantidade: 150 }, { insumo: 'Frango (filé)', quantidade: 80 }] },
      ],
    },
    { nome: 'Sobremesas', enviaCozinha: true, produtos: [{ nome: 'Pudim', preco: 14, ficha: [{ insumo: 'Pudim (porção)', quantidade: 1 }] }] },
    { nome: 'Bebidas', enviaCozinha: false, produtos: [{ nome: 'Refrigerante', preco: 7, ficha: [{ insumo: 'Refrigerante lata', quantidade: 1 }] }] },
  ],
  mesas: 12,
}

const padaria = {
  id: 'padaria',
  nome: 'Padaria',
  descricao: 'Balcão, café coado e lanches na chapa.',
  fornecedores: [{ nome: 'Moinho Estrela', prazoEntregaDias: 2 }, { nome: 'Laticínios Bom Pasto', prazoEntregaDias: 1 }],
  insumos: [
    { nome: 'Pão francês', unidade: 'un', quantidade: 200, estoqueMinimo: 120, custoUnitario: 0.45, fornecedor: 'Moinho Estrela' },
    { nome: 'Manteiga', unidade: 'g', quantidade: 800, estoqueMinimo: 1000, custoUnitario: 0.05, fornecedor: 'Laticínios Bom Pasto' },
    { nome: 'Café moído', unidade: 'g', quantidade: 2000, estoqueMinimo: 1000, custoUnitario: 0.06, fornecedor: 'Moinho Estrela' },
    { nome: 'Leite integral', unidade: 'ml', quantidade: 10000, estoqueMinimo: 6000, custoUnitario: 0.0055, fornecedor: 'Laticínios Bom Pasto' },
    { nome: 'Queijo prato', unidade: 'g', quantidade: 1500, estoqueMinimo: 1000, custoUnitario: 0.05, fornecedor: 'Laticínios Bom Pasto' },
  ],
  categorias: [
    {
      nome: 'Balcão',
      enviaCozinha: false,
      produtos: [
        { nome: 'Pão francês', preco: 1, ficha: [{ insumo: 'Pão francês', quantidade: 1 }] },
        { nome: 'Café coado', preco: 5, ficha: [{ insumo: 'Café moído', quantidade: 10 }] },
        { nome: 'Pingado', preco: 6, ficha: [{ insumo: 'Café moído', quantidade: 8 }, { insumo: 'Leite integral', quantidade: 100 }] },
      ],
    },
    {
      nome: 'Chapa',
      enviaCozinha: true,
      produtos: [
        { nome: 'Pão na chapa', preco: 8, ficha: [{ insumo: 'Pão francês', quantidade: 1 }, { insumo: 'Manteiga', quantidade: 15 }] },
        { nome: 'Misto quente', preco: 14, ficha: [{ insumo: 'Pão francês', quantidade: 1 }, { insumo: 'Queijo prato', quantidade: 40 }] },
      ],
    },
  ],
  mesas: 6,
}

export const TEMPLATES = [cafeteria, bar, restaurante, padaria]

export const SEGMENTOS = [
  { id: 'cafeteria', nome: 'Cafeteria', icone: 'coffee' },
  { id: 'bar', nome: 'Bar', icone: 'beer' },
  { id: 'restaurante', nome: 'Restaurante', icone: 'plate' },
  { id: 'padaria', nome: 'Padaria', icone: 'bread' },
  { id: 'outro', nome: 'Outro', icone: 'store' },
]

export function templateDoSegmento(segmento) {
  return TEMPLATES.find((t) => t.id === segmento) ?? cafeteria
}

/** Remove campos só de exibição antes de enviar para /setup/importar. */
export function payloadDoTemplate({ fornecedores, insumos, categorias, mesas }) {
  return { fornecedores, insumos, categorias, mesas }
}
