import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import Fornecedor from 'App/Models/Fornecedor'

const fornecedorSchema = schema.create({
  nome: schema.string({ trim: true }),
  contato: schema.string.nullableAndOptional({ trim: true }),
  telefone: schema.string.nullableAndOptional({ trim: true }),
  prazoEntregaDias: schema.number.optional(),
})

export default class FornecedoresController {
  public async index({ auth }: HttpContextContract) {
    return Fornecedor.query().where('tenant_id', auth.user!.tenantId).orderBy('nome')
  }

  public async store({ auth, request }: HttpContextContract) {
    const dados = await request.validate({ schema: fornecedorSchema })
    return Fornecedor.create({ ...dados, prazoEntregaDias: dados.prazoEntregaDias ?? 2, tenantId: auth.user!.tenantId })
  }

  public async update({ auth, params, request }: HttpContextContract) {
    const fornecedor = await Fornecedor.query().where('tenant_id', auth.user!.tenantId).where('id', params.id).firstOrFail()
    fornecedor.merge(await request.validate({ schema: fornecedorSchema }))
    await fornecedor.save()
    return fornecedor
  }

  public async destroy({ auth, params }: HttpContextContract) {
    const fornecedor = await Fornecedor.query().where('tenant_id', auth.user!.tenantId).where('id', params.id).firstOrFail()
    await fornecedor.delete()
    return { ok: true }
  }
}
