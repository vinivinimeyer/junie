import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Produto from 'App/Models/Produto'
import Insumo from 'App/Models/Insumo'

/** Produto + ficha técnica num formato simples para o front. */
export function apresentarProduto(produto: Produto) {
  const { ficha, ...base } = produto.serialize()
  return {
    ...base,
    ficha: (produto.ficha ?? []).map((insumo) => ({
      insumoId: insumo.id,
      nome: insumo.nome,
      unidade: insumo.unidade,
      quantidade: Number(insumo.$extras.pivot_quantidade),
      custoUnitario: insumo.custoUnitario,
    })),
  }
}

const produtoSchema = schema.create({
  categoriaId: schema.number(),
  nome: schema.string({ trim: true }),
  descricao: schema.string.nullableAndOptional({ trim: true }),
  preco: schema.number([rules.range(0, 1_000_000)]),
  custoManual: schema.number.nullableAndOptional(),
  ordem: schema.number.optional(),
  ativo: schema.boolean.optional(),
  ficha: schema.array.optional().members(
    schema.object().members({
      insumoId: schema.number(),
      quantidade: schema.number([rules.range(0.001, 1_000_000)]),
    })
  ),
})

export default class ProdutosController {
  public async index({ auth, request }: HttpContextContract) {
    const query = Produto.query()
      .where('tenant_id', auth.user!.tenantId)
      .preload('ficha')
      .orderBy('ordem')
      .orderBy('id')
    if (request.input('ativos') !== undefined) query.where('ativo', true)
    return (await query).map(apresentarProduto)
  }

  public async show({ auth, params }: HttpContextContract) {
    const produto = await Produto.query()
      .where('tenant_id', auth.user!.tenantId)
      .where('id', params.id)
      .preload('ficha')
      .firstOrFail()
    return apresentarProduto(produto)
  }

  public async store({ auth, request }: HttpContextContract) {
    const { ficha, ...dados } = await request.validate({ schema: produtoSchema })
    const tenantId = auth.user!.tenantId
    const produto = await Database.transaction(async (trx) => {
      const produto = await Produto.create(
        { ...dados, ativo: dados.ativo ?? true, ordem: dados.ordem ?? 0, tenantId },
        { client: trx }
      )
      if (ficha) await this.salvarFicha(produto, tenantId, ficha)
      return produto
    })
    await produto.load('ficha')
    return apresentarProduto(produto)
  }

  public async update({ auth, params, request }: HttpContextContract) {
    const tenantId = auth.user!.tenantId
    const { ficha, ...dados } = await request.validate({ schema: produtoSchema })
    const produto = await Produto.query().where('tenant_id', tenantId).where('id', params.id).firstOrFail()
    await Database.transaction(async (trx) => {
      produto.useTransaction(trx)
      produto.merge(dados)
      await produto.save()
      if (ficha) await this.salvarFicha(produto, tenantId, ficha)
    })
    await produto.load('ficha')
    return apresentarProduto(produto)
  }

  /** Arquiva em vez de apagar, para não quebrar o histórico de vendas (como o status=1 do Logico). */
  public async destroy({ auth, params }: HttpContextContract) {
    const produto = await Produto.query().where('tenant_id', auth.user!.tenantId).where('id', params.id).firstOrFail()
    produto.ativo = false
    await produto.save()
    return { ok: true }
  }

  private async salvarFicha(produto: Produto, tenantId: number, ficha: { insumoId: number; quantidade: number }[]) {
    const validos = await Insumo.query({ client: produto.$trx })
      .where('tenant_id', tenantId)
      .whereIn('id', ficha.map((f) => f.insumoId))
      .select('id')
    const ids = new Set(validos.map((i) => i.id))
    await produto.related('ficha').sync(
      Object.fromEntries(ficha.filter((f) => ids.has(f.insumoId)).map((f) => [f.insumoId, { quantidade: f.quantidade }]))
    )
  }
}
