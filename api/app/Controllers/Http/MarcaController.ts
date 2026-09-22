import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Tenant from 'App/Models/Tenant'

const cor = () => schema.string.optional({ trim: true }, [rules.regex(/^#[0-9a-fA-F]{6}$/)])

/** Campos visuais editáveis no onboarding de marca e em Configurações. */
export const marcaSchema = {
  logo: schema.string.nullableAndOptional({}, [rules.maxLength(3_000_000)]),
  logoEscala: schema.number.optional([rules.range(0.3, 3)]),
  logoX: schema.number.optional([rules.range(-50, 50)]),
  logoY: schema.number.optional([rules.range(-50, 50)]),
  corPrimaria: cor(),
  corDestaque: cor(),
  tema: schema.enum.optional(['claro', 'escuro'] as const),
  fonte: schema.string.optional({ trim: true }),
  cantos: schema.enum.optional(['reto', 'suave', 'redondo'] as const),
  chavePix: schema.string.nullableAndOptional({ trim: true }),
  cidadePix: schema.string.nullableAndOptional({ trim: true }),
  mensagemRecibo: schema.string.nullableAndOptional({ trim: true }),
}

export default class MarcaController {
  /** Branding público: a tela de login de cada cliente em /entrar/:slug. */
  public async publica({ params }: HttpContextContract) {
    const tenant = await Tenant.findByOrFail('slug', params.slug)
    return tenant.toBranding()
  }

  public async show({ auth }: HttpContextContract) {
    return Tenant.findOrFail(auth.user!.tenantId)
  }

  public async update({ auth, request }: HttpContextContract) {
    const dados = await request.validate({
      schema: schema.create({
        nome: schema.string.optional({ trim: true }),
        segmento: schema.string.optional(),
        ...marcaSchema,
      }),
    })
    const tenant = await Tenant.findOrFail(auth.user!.tenantId)
    tenant.merge(dados)
    await tenant.save()
    return tenant
  }

  /** Marca etapas do onboarding operacional como concluídas. */
  public async onboarding({ auth, request }: HttpContextContract) {
    const tenant = await Tenant.findOrFail(auth.user!.tenantId)
    const etapas = request.only(['marca', 'cardapio', 'mesas', 'estoque'])
    tenant.onboarding = { ...tenant.onboarding, ...etapas }
    await tenant.save()
    return tenant
  }
}
