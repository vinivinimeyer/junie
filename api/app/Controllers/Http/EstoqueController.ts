import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Insumo from 'App/Models/Insumo'
import MovimentacaoEstoque from 'App/Models/MovimentacaoEstoque'
import EstoqueService from 'App/Services/EstoqueService'

export default class EstoqueController {
  public async visao({ auth }: HttpContextContract) {
    return EstoqueService.visao(auth.user!.tenantId)
  }

  public async movimentacoes({ auth, request }: HttpContextContract) {
    const query = MovimentacaoEstoque.query()
      .where('tenant_id', auth.user!.tenantId)
      .preload('insumo', (q) => q.select('id', 'nome', 'unidade'))
      .orderBy('id', 'desc')
      .limit(Math.min(Number(request.input('limite', 100)), 500))
    if (request.input('insumo_id')) query.where('insumo_id', request.input('insumo_id'))
    if (request.input('tipo')) query.where('tipo', request.input('tipo'))
    return query
  }

  /**
   * Inventário (contagem física): recebe o saldo contado de vários insumos e
   * lança um ajuste só onde há diferença. Devolve as divergências em R$.
   */
  public async inventario({ auth, request }: HttpContextContract) {
    const user = auth.user!
    const { contagens } = await request.validate({
      schema: schema.create({
        contagens: schema.array().members(
          schema.object().members({ insumoId: schema.number(), quantidade: schema.number() })
        ),
      }),
    })

    return Database.transaction(async (trx) => {
      const insumos = await Insumo.query({ client: trx })
        .where('tenant_id', user.tenantId)
        .whereIn('id', contagens.map((c) => c.insumoId))
      const porId = new Map(insumos.map((i) => [i.id, i]))

      const divergencias: object[] = []
      for (const contagem of contagens) {
        const insumo = porId.get(contagem.insumoId)
        if (!insumo) continue
        const diferenca = Math.round((contagem.quantidade - insumo.quantidade) * 1000) / 1000
        if (diferenca === 0) continue
        await EstoqueService.movimentar(trx, {
          tenantId: user.tenantId,
          insumoId: insumo.id,
          tipo: 'ajuste',
          quantidade: diferenca,
          motivo: 'Inventário',
          userId: user.id,
        })
        divergencias.push({
          insumoId: insumo.id,
          nome: insumo.nome,
          unidade: insumo.unidade,
          sistema: insumo.quantidade,
          contado: contagem.quantidade,
          diferenca,
          valor: Math.round(diferenca * insumo.custoUnitario * 100) / 100,
        })
      }
      return { divergencias }
    })
  }
}
