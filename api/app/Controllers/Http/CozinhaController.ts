import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import { DateTime } from 'luxon'
import PedidoItem, { STATUS_PEDIDO } from 'App/Models/PedidoItem'
import { paraBanco } from 'App/Services/datas'

export default class CozinhaController {
  /** Fila da cozinha/bar: itens não entregues das últimas 24h, mais antigos primeiro. */
  public async index({ auth }: HttpContextContract) {
    return PedidoItem.query()
      .where('tenant_id', auth.user!.tenantId)
      .whereNot('status', 'entregue')
      .where('created_at', '>=', paraBanco(DateTime.now().minus({ hours: 24 })))
      .preload('produto', (q) => q.select('id', 'nome'))
      .preload('mesa', (q) => q.select('id', 'numero', 'rotulo', 'nome_cliente'))
      .orderBy('id')
  }

  public async status({ auth, params, request }: HttpContextContract) {
    const { status } = await request.validate({
      schema: schema.create({ status: schema.enum(STATUS_PEDIDO) }),
    })
    const item = await PedidoItem.query().where('tenant_id', auth.user!.tenantId).where('id', params.id).firstOrFail()
    item.status = status
    await item.save()
    return item
  }
}
