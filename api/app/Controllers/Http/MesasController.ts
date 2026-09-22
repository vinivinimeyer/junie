import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import { Exception } from '@adonisjs/core/build/standalone'
import Database from '@ioc:Adonis/Lucid/Database'
import { DateTime } from 'luxon'
import Mesa from 'App/Models/Mesa'
import PedidoItem from 'App/Models/PedidoItem'
import Produto from 'App/Models/Produto'
import { FORMAS_PAGAMENTO } from 'App/Models/Venda'
import VendaService from 'App/Services/VendaService'

function apresentarMesa(mesa: Mesa) {
  const itens = mesa.itens ?? []
  return {
    ...mesa.serialize(),
    total: Math.round(itens.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0) * 100) / 100,
    ocupada: itens.length > 0,
  }
}

export default class MesasController {
  public async index({ auth }: HttpContextContract) {
    const mesas = await Mesa.query()
      .where('tenant_id', auth.user!.tenantId)
      .preload('itens', (q) => q.preload('produto', (p) => p.select('id', 'nome')).orderBy('id'))
      .orderBy('numero')
    return mesas.map(apresentarMesa)
  }

  public async show({ auth, params }: HttpContextContract) {
    const mesa = await Mesa.query()
      .where('tenant_id', auth.user!.tenantId)
      .where('id', params.id)
      .preload('itens', (q) => q.preload('produto', (p) => p.select('id', 'nome')).orderBy('id'))
      .firstOrFail()
    return apresentarMesa(mesa)
  }

  /** Cria N mesas em sequência (usado no onboarding: "tenho 12 mesas"). */
  public async lote({ auth, request }: HttpContextContract) {
    const tenantId = auth.user!.tenantId
    const { quantidade, prefixo } = await request.validate({
      schema: schema.create({
        quantidade: schema.number([rules.range(1, 200)]),
        prefixo: schema.string.optional({ trim: true }),
      }),
    })
    const ultima = await Mesa.query().where('tenant_id', tenantId).max('numero as max').first()
    const inicio = Number(ultima?.$extras.max ?? 0) + 1
    return Mesa.createMany(
      Array.from({ length: quantidade }, (_, i) => ({
        tenantId,
        numero: inicio + i,
        rotulo: prefixo ? `${prefixo} ${inicio + i}` : null,
      }))
    )
  }

  public async update({ auth, params, request }: HttpContextContract) {
    const mesa = await Mesa.query().where('tenant_id', auth.user!.tenantId).where('id', params.id).firstOrFail()
    mesa.merge(request.only(['rotulo', 'nomeCliente']))
    await mesa.save()
    return mesa
  }

  public async destroy({ auth, params, response }: HttpContextContract) {
    const mesa = await Mesa.query().where('tenant_id', auth.user!.tenantId).where('id', params.id).preload('itens').firstOrFail()
    if (mesa.itens.length) return response.conflict({ message: 'Feche a conta antes de remover a mesa' })
    await mesa.delete()
    return { ok: true }
  }

  /** Lança itens na comanda. Categorias com envia_cozinha geram ticket na cozinha. */
  public async adicionar({ auth, params, request }: HttpContextContract) {
    const tenantId = auth.user!.tenantId
    const dados = await request.validate({
      schema: schema.create({
        nomeCliente: schema.string.nullableAndOptional({ trim: true }),
        itens: schema.array([rules.minLength(1)]).members(
          schema.object().members({
            produtoId: schema.number(),
            quantidade: schema.number([rules.range(1, 999)]),
            observacao: schema.string.nullableAndOptional({ trim: true }),
          })
        ),
      }),
    })

    const mesa = await Mesa.query().where('tenant_id', tenantId).where('id', params.id).firstOrFail()
    const produtos = await Produto.query()
      .where('tenant_id', tenantId)
      .whereIn('id', dados.itens.map((i) => i.produtoId))
      .preload('categoria')
    const porId = new Map(produtos.map((p) => [p.id, p]))

    await Database.transaction(async (trx) => {
      mesa.useTransaction(trx)
      if (dados.nomeCliente !== undefined) mesa.nomeCliente = dados.nomeCliente
      if (!mesa.abertaEm) mesa.abertaEm = DateTime.now()
      await mesa.save()

      for (const item of dados.itens) {
        const produto = porId.get(item.produtoId)
        if (!produto) throw new Exception(`Produto ${item.produtoId} não encontrado`, 404)
        await PedidoItem.create(
          {
            tenantId,
            mesaId: mesa.id,
            produtoId: produto.id,
            quantidade: item.quantidade,
            precoUnitario: produto.preco,
            observacao: item.observacao ?? null,
            status: produto.categoria.enviaCozinha ? 'novo' : 'entregue',
          },
          { client: trx }
        )
      }
    })

    return this.show({ auth, params } as HttpContextContract)
  }

  public async remover({ auth, params }: HttpContextContract) {
    await PedidoItem.query()
      .where('tenant_id', auth.user!.tenantId)
      .where('mesa_id', params.id)
      .where('id', params.itemId)
      .whereNull('venda_id')
      .delete()
    return this.show({ auth, params } as HttpContextContract)
  }

  /** Fecha a conta: vira uma venda (baixa estoque) e libera a mesa. */
  public async fechar({ auth, params, request, response }: HttpContextContract) {
    const user = auth.user!
    const { formaPagamento } = await request.validate({
      schema: schema.create({ formaPagamento: schema.enum(FORMAS_PAGAMENTO) }),
    })
    const mesa = await Mesa.query().where('tenant_id', user.tenantId).where('id', params.id).preload('itens').firstOrFail()
    if (!mesa.itens.length) return response.unprocessableEntity({ message: 'Mesa sem itens em aberto' })

    const venda = await Database.transaction(async (trx) => {
      const venda = await VendaService.registrar(trx, {
        tenantId: user.tenantId,
        userId: user.id,
        mesaId: mesa.id,
        rotulo: mesa.nomeCliente || mesa.rotulo || `Mesa ${mesa.numero}`,
        formaPagamento,
        itens: mesa.itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade, precoUnitario: i.precoUnitario })),
      })
      await PedidoItem.query({ client: trx })
        .whereIn('id', mesa.itens.map((i) => i.id))
        .update({ venda_id: venda.id })
      mesa.useTransaction(trx)
      mesa.merge({ nomeCliente: null, abertaEm: null })
      await mesa.save()
      return venda
    })

    return venda
  }
}
