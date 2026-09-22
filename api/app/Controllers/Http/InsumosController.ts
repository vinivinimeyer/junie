import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Insumo, { UNIDADES } from 'App/Models/Insumo'
import EstoqueService from 'App/Services/EstoqueService'

const insumoSchema = schema.create({
  nome: schema.string({ trim: true }),
  unidade: schema.enum(UNIDADES),
  fornecedorId: schema.number.nullableAndOptional(),
  estoqueMinimo: schema.number.optional([rules.range(0, 10_000_000)]),
  custoUnitario: schema.number.optional([rules.range(0, 10_000_000)]),
  ativo: schema.boolean.optional(),
  // Só no cadastro: vira uma movimentação de entrada "Estoque inicial".
  quantidadeInicial: schema.number.optional([rules.range(0, 10_000_000)]),
})

export default class InsumosController {
  public async index({ auth }: HttpContextContract) {
    return Insumo.query().where('tenant_id', auth.user!.tenantId).where('ativo', true).preload('fornecedor').orderBy('nome')
  }

  public async show({ auth, params }: HttpContextContract) {
    return Insumo.query().where('tenant_id', auth.user!.tenantId).where('id', params.id).preload('fornecedor').firstOrFail()
  }

  public async store({ auth, request }: HttpContextContract) {
    const { quantidadeInicial, ...dados } = await request.validate({ schema: insumoSchema })
    const user = auth.user!
    return Database.transaction(async (trx) => {
      const insumo = await Insumo.create({ ...dados, quantidade: 0, tenantId: user.tenantId }, { client: trx })
      if (quantidadeInicial) {
        await EstoqueService.movimentar(trx, {
          tenantId: user.tenantId,
          insumoId: insumo.id,
          tipo: 'entrada',
          quantidade: quantidadeInicial,
          custoUnitario: dados.custoUnitario ?? 0,
          motivo: 'Estoque inicial',
          userId: user.id,
        })
        await insumo.refresh()
      }
      return insumo
    })
  }

  /** O saldo não é editável aqui: use /movimentar ou o inventário. */
  public async update({ auth, params, request }: HttpContextContract) {
    const insumo = await Insumo.query().where('tenant_id', auth.user!.tenantId).where('id', params.id).firstOrFail()
    const { quantidadeInicial: _ignorado, ...dados } = await request.validate({ schema: insumoSchema })
    insumo.merge(dados)
    await insumo.save()
    return insumo
  }

  public async destroy({ auth, params }: HttpContextContract) {
    const insumo = await Insumo.query().where('tenant_id', auth.user!.tenantId).where('id', params.id).firstOrFail()
    insumo.ativo = false
    await insumo.save()
    return { ok: true }
  }

  /**
   * entrada: compra/recebimento (atualiza custo médio)
   * perda:   quebra, vencimento, desperdício (motivo obrigatório)
   * ajuste:  informa o saldo contado e o sistema lança a diferença
   */
  public async movimentar({ auth, params, request }: HttpContextContract) {
    const user = auth.user!
    const dados = await request.validate({
      schema: schema.create({
        tipo: schema.enum(['entrada', 'perda', 'ajuste'] as const),
        quantidade: schema.number([rules.range(0, 10_000_000)]),
        custoUnitario: schema.number.optional([rules.range(0, 10_000_000)]),
        motivo: schema.string.optional({ trim: true }, [
          rules.requiredWhen('tipo', '=', 'perda'),
        ]),
      }),
      messages: { 'motivo.requiredWhen': 'Informe o motivo da perda' },
    })
    const insumo = await Insumo.query().where('tenant_id', user.tenantId).where('id', params.id).firstOrFail()

    const delta =
      dados.tipo === 'entrada' ? dados.quantidade : dados.tipo === 'perda' ? -dados.quantidade : dados.quantidade - insumo.quantidade

    const movimentacao = await Database.transaction((trx) =>
      EstoqueService.movimentar(trx, {
        tenantId: user.tenantId,
        insumoId: insumo.id,
        tipo: dados.tipo,
        quantidade: delta,
        custoUnitario: dados.custoUnitario,
        motivo: dados.motivo ?? (dados.tipo === 'ajuste' ? 'Ajuste manual' : null),
        userId: user.id,
      })
    )
    await insumo.refresh()
    return { insumo, movimentacao }
  }
}
