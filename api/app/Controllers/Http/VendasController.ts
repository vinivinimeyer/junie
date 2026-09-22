import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Venda, { FORMAS_PAGAMENTO } from 'App/Models/Venda'
import EstoqueService from 'App/Services/EstoqueService'
import VendaService from 'App/Services/VendaService'
import { paraBanco, periodo } from 'App/Services/datas'

export default class VendasController {
  public async index({ auth, request }: HttpContextContract) {
    const { inicio, fim } = periodo(request.input('de'), request.input('ate'))
    return Venda.query()
      .where('tenant_id', auth.user!.tenantId)
      .whereBetween('created_at', [paraBanco(inicio), paraBanco(fim)])
      .preload('itens')
      .orderBy('id', 'desc')
  }

  /** Venda de balcão (PDV), sem mesa. */
  public async store({ auth, request }: HttpContextContract) {
    const user = auth.user!
    const dados = await request.validate({
      schema: schema.create({
        formaPagamento: schema.enum(FORMAS_PAGAMENTO),
        rotulo: schema.string.nullableAndOptional({ trim: true }),
        itens: schema.array([rules.minLength(1)]).members(
          schema.object().members({
            produtoId: schema.number(),
            quantidade: schema.number([rules.range(1, 999)]),
          })
        ),
      }),
    })
    return Database.transaction((trx) =>
      VendaService.registrar(trx, { ...dados, tenantId: user.tenantId, userId: user.id })
    )
  }

  /** Cancela e devolve os insumos ao estoque (o Logico não estornava). */
  public async cancelar({ auth, params, response }: HttpContextContract) {
    const user = auth.user!
    const venda = await Venda.query().where('tenant_id', user.tenantId).where('id', params.id).firstOrFail()
    if (venda.status === 'cancelada') return response.conflict({ message: 'Venda já cancelada' })

    await Database.transaction(async (trx) => {
      venda.useTransaction(trx)
      venda.status = 'cancelada'
      await venda.save()
      await EstoqueService.estornarVenda(trx, user.tenantId, venda.id, user.id)
    })
    await venda.load('itens')
    return venda
  }
}
