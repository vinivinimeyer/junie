import { Exception } from '@adonisjs/core/build/standalone'
import { TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
import Produto from 'App/Models/Produto'
import Venda, { FORMAS_PAGAMENTO } from 'App/Models/Venda'
import VendaItem from 'App/Models/VendaItem'
import EstoqueService from './EstoqueService'

type NovaVenda = {
  tenantId: number
  userId: number | null
  mesaId?: number | null
  rotulo?: string | null
  formaPagamento: typeof FORMAS_PAGAMENTO[number]
  /** Preço opcional: itens de mesa usam o preço registrado no pedido. */
  itens: { produtoId: number; quantidade: number; precoUnitario?: number }[]
}

export default class VendaService {
  /**
   * Registra a venda, os itens (com snapshot de preço e custo) e baixa o
   * estoque, tudo na mesma transação. No Logico isso eram 1 + N requisições
   * soltas do navegador; se uma falhava, a venda ficava pela metade.
   */
  public static async registrar(trx: TransactionClientContract, dados: NovaVenda) {
    const itens = dados.itens.filter((i) => i.quantidade > 0)
    if (!itens.length) {
      throw new Exception('A venda precisa de pelo menos um item', 422, 'E_VENDA_VAZIA')
    }

    const produtos = await Produto.query({ client: trx })
      .where('tenant_id', dados.tenantId)
      .whereIn('id', itens.map((i) => i.produtoId))
      .preload('ficha')
    const porId = new Map(produtos.map((p) => [p.id, p]))

    let total = 0
    let custo = 0
    const linhas = itens.map((item) => {
      const produto = porId.get(item.produtoId)
      if (!produto) throw new Exception(`Produto ${item.produtoId} não encontrado`, 404, 'E_PRODUTO')
      const preco = item.precoUnitario ?? produto.preco
      total += preco * item.quantidade
      custo += produto.custo * item.quantidade
      return {
        produtoId: produto.id,
        nome: produto.nome,
        quantidade: item.quantidade,
        precoUnitario: preco,
        custoUnitario: produto.custo,
      }
    })

    const venda = await Venda.create(
      {
        tenantId: dados.tenantId,
        userId: dados.userId,
        mesaId: dados.mesaId ?? null,
        rotulo: dados.rotulo ?? null,
        formaPagamento: dados.formaPagamento,
        total: Math.round(total * 100) / 100,
        custo: Math.round(custo * 10000) / 10000,
        status: 'concluida',
      },
      { client: trx }
    )

    await VendaItem.createMany(
      linhas.map((l) => ({ ...l, vendaId: venda.id })),
      { client: trx }
    )

    await EstoqueService.baixarVenda(trx, dados.tenantId, venda.id, itens, dados.userId)

    await venda.load('itens')
    return venda
  }
}
