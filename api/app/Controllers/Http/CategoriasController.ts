import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import Categoria from 'App/Models/Categoria'

const categoriaSchema = schema.create({
  nome: schema.string({ trim: true }),
  ordem: schema.number.optional(),
  enviaCozinha: schema.boolean.optional(),
})

export default class CategoriasController {
  public async index({ auth }: HttpContextContract) {
    return Categoria.query().where('tenant_id', auth.user!.tenantId).orderBy('ordem').orderBy('id')
  }

  public async store({ auth, request }: HttpContextContract) {
    const dados = await request.validate({ schema: categoriaSchema })
    const ultima = await Categoria.query().where('tenant_id', auth.user!.tenantId).max('ordem as max').first()
    return Categoria.create({
      ...dados,
      enviaCozinha: dados.enviaCozinha ?? true,
      ordem: dados.ordem ?? Number(ultima?.$extras.max ?? -1) + 1,
      tenantId: auth.user!.tenantId,
    })
  }

  public async update({ auth, params, request }: HttpContextContract) {
    const categoria = await Categoria.query().where('tenant_id', auth.user!.tenantId).where('id', params.id).firstOrFail()
    categoria.merge(await request.validate({ schema: categoriaSchema }))
    await categoria.save()
    return categoria
  }

  public async destroy({ auth, params }: HttpContextContract) {
    const categoria = await Categoria.query().where('tenant_id', auth.user!.tenantId).where('id', params.id).firstOrFail()
    await categoria.delete()
    return { ok: true }
  }
}
