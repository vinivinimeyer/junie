import { DateTime } from 'luxon'
import Database, { TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
import Insumo from 'App/Models/Insumo'
import MovimentacaoEstoque, { TipoMovimentacao } from 'App/Models/MovimentacaoEstoque'
import { paraBanco } from './datas'

type Movimento = {
  tenantId: number
  insumoId: number
  tipo: TipoMovimentacao
  /** Positivo soma ao saldo, negativo subtrai. */
  quantidade: number
  custoUnitario?: number
  motivo?: string | null
  userId?: number | null
  vendaId?: number | null
}

/** Dias de estoque extra além do prazo do fornecedor ao sugerir compra. */
const DIAS_DE_SEGURANCA = 7
/** Janela usada para calcular o consumo médio diário. */
const JANELA_CONSUMO_DIAS = 14

const arred = (n: number, casas = 3) => Math.round(n * 10 ** casas) / 10 ** casas

/** Arredonda a sugestão de compra para lotes que fazem sentido no pedido (ex.: 29.132 ml -> 30 L). */
export function arredondarCompra(quantidade: number, unidade: string) {
  if (quantidade <= 0) return 0
  const passo =
    unidade === 'g' || unidade === 'ml'
      ? quantidade >= 5000 ? 1000 : quantidade >= 1000 ? 500 : 100
      : unidade === 'kg' || unidade === 'l'
        ? quantidade >= 10 ? 1 : 0.5
        : quantidade >= 100 ? 10 : 1
  return Math.ceil(quantidade / passo) * passo
}

export default class EstoqueService {
  /**
   * Única porta de alteração de saldo. O incremento é atômico no banco, então
   * duas vendas simultâneas não sobrescrevem o saldo uma da outra (no Logico o
   * saldo era lido, subtraído no Node e salvo).
   */
  public static async movimentar(trx: TransactionClientContract, mov: Movimento) {
    const insumo = await Insumo.query({ client: trx })
      .where('tenant_id', mov.tenantId)
      .where('id', mov.insumoId)
      .firstOrFail()

    let custo = insumo.custoUnitario
    if (mov.tipo === 'entrada' && mov.custoUnitario !== undefined && mov.quantidade > 0) {
      // Custo médio ponderado: a compra nova dilui o custo do que já estava na prateleira.
      const saldoAtual = Math.max(insumo.quantidade, 0)
      custo = (saldoAtual * insumo.custoUnitario + mov.quantidade * mov.custoUnitario) / (saldoAtual + mov.quantidade)
      await trx.from('insumos').where('id', insumo.id).update({ custo_unitario: arred(custo, 4) })
    }

    await trx.from('insumos').where('id', insumo.id).increment('quantidade', mov.quantidade)
    const { quantidade: saldo } = await trx.from('insumos').where('id', insumo.id).select('quantidade').firstOrFail()

    return MovimentacaoEstoque.create(
      {
        tenantId: mov.tenantId,
        insumoId: insumo.id,
        tipo: mov.tipo,
        quantidade: arred(mov.quantidade),
        custoUnitario: arred(mov.tipo === 'entrada' ? mov.custoUnitario ?? custo : custo, 4),
        saldoApos: arred(Number(saldo)),
        motivo: mov.motivo ?? null,
        userId: mov.userId ?? null,
        vendaId: mov.vendaId ?? null,
      },
      { client: trx }
    )
  }

  /** Baixa os insumos de uma venda com base na ficha técnica de cada produto. */
  public static async baixarVenda(
    trx: TransactionClientContract,
    tenantId: number,
    vendaId: number,
    itens: { produtoId: number; quantidade: number }[],
    userId?: number | null
  ) {
    const produtoIds = itens.map((i) => i.produtoId)
    if (!produtoIds.length) return

    const ficha = await trx.from('ficha_tecnica').whereIn('produto_id', produtoIds)
    const consumo = new Map<number, number>()
    for (const linha of ficha) {
      const vendidos = itens
        .filter((i) => i.produtoId === linha.produto_id)
        .reduce((s, i) => s + i.quantidade, 0)
      consumo.set(linha.insumo_id, (consumo.get(linha.insumo_id) ?? 0) + vendidos * Number(linha.quantidade))
    }

    for (const [insumoId, quantidade] of consumo) {
      await this.movimentar(trx, { tenantId, insumoId, tipo: 'venda', quantidade: -quantidade, vendaId, userId })
    }
  }

  /** Devolve ao estoque tudo que uma venda cancelada consumiu. */
  public static async estornarVenda(trx: TransactionClientContract, tenantId: number, vendaId: number, userId?: number | null) {
    const baixas = await MovimentacaoEstoque.query({ client: trx })
      .where('tenant_id', tenantId)
      .where('venda_id', vendaId)
      .where('tipo', 'venda')

    for (const baixa of baixas) {
      await this.movimentar(trx, {
        tenantId,
        insumoId: baixa.insumoId,
        tipo: 'estorno',
        quantidade: -baixa.quantidade,
        vendaId,
        userId,
        motivo: `Cancelamento da venda #${vendaId}`,
      })
    }
  }

  /**
   * Painel do estoque: saldo, valor a custo, consumo médio, dias de cobertura,
   * status e sugestão de compra por insumo.
   */
  public static async visao(tenantId: number) {
    const insumos = await Insumo.query()
      .where('tenant_id', tenantId)
      .where('ativo', true)
      .preload('fornecedor')
      .orderBy('nome')

    const desde = paraBanco(DateTime.now().minus({ days: JANELA_CONSUMO_DIAS }))
    const consumoRows = await Database.from('movimentacoes_estoque')
      .where('tenant_id', tenantId)
      .whereIn('tipo', ['venda', 'estorno'])
      .where('created_at', '>=', desde)
      .groupBy('insumo_id')
      .select('insumo_id')
      .sum('quantidade as total')
    const consumo = new Map<number, number>(consumoRows.map((r) => [r.insumo_id, -Number(r.total)]))

    const desde30 = paraBanco(DateTime.now().minus({ days: 30 }))
    const perdasRows = await Database.from('movimentacoes_estoque')
      .where('tenant_id', tenantId)
      .where('tipo', 'perda')
      .where('created_at', '>=', desde30)
      .select('quantidade', 'custo_unitario')
    const perdas30d = perdasRows.reduce((s, r) => s + Math.abs(Number(r.quantidade)) * Number(r.custo_unitario), 0)

    const itens = insumos.map((insumo) => {
      const consumoDiario = Math.max(consumo.get(insumo.id) ?? 0, 0) / JANELA_CONSUMO_DIAS
      const prazo = insumo.fornecedor?.prazoEntregaDias ?? 2
      const cobertura = consumoDiario > 0 ? insumo.quantidade / consumoDiario : null
      const pontoDePedido = Math.max(insumo.estoqueMinimo, consumoDiario * prazo)
      const alvo = Math.max(insumo.estoqueMinimo * 2, consumoDiario * (prazo + DIAS_DE_SEGURANCA))

      let status: 'ok' | 'baixo' | 'critico' | 'zerado' = 'ok'
      if (insumo.quantidade <= 0) status = 'zerado'
      else if (insumo.quantidade < insumo.estoqueMinimo / 2 || (cobertura !== null && cobertura < prazo)) status = 'critico'
      else if (insumo.quantidade <= pontoDePedido) status = 'baixo'

      const sugestao = status === 'ok' ? 0 : arredondarCompra(alvo - insumo.quantidade, insumo.unidade)

      return {
        ...insumo.serialize(),
        valorEmEstoque: arred(Math.max(insumo.quantidade, 0) * insumo.custoUnitario, 2),
        consumoDiario: arred(consumoDiario),
        coberturaDias: cobertura === null ? null : arred(cobertura, 1),
        pontoDePedido: arred(pontoDePedido),
        status,
        sugestaoCompra: sugestao,
        custoSugestao: arred(sugestao * insumo.custoUnitario, 2),
      }
    })

    return {
      resumo: {
        valorTotal: arred(itens.reduce((s, i) => s + i.valorEmEstoque, 0), 2),
        itens: itens.length,
        emAlerta: itens.filter((i) => i.status !== 'ok').length,
        zerados: itens.filter((i) => i.status === 'zerado').length,
        perdas30d: arred(perdas30d, 2),
        custoReposicao: arred(itens.reduce((s, i) => s + i.custoSugestao, 0), 2),
      },
      itens,
    }
  }
}
