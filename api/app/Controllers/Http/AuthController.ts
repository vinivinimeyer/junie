import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Tenant from 'App/Models/Tenant'
import User from 'App/Models/User'
import { marcaSchema } from './MarcaController'

function slugify(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40) || 'minha-marca'
}

export default class AuthController {
  /**
   * Fim do onboarding de marca: cria o tenant já com a identidade visual e o
   * usuário dono. Substitui os e-mails/senhas fixos no Login.vue do Logico.
   */
  public async cadastro({ request, auth }: HttpContextContract) {
    const dados = await request.validate({
      schema: schema.create({
        nome: schema.string({ trim: true }),
        email: schema.string({ trim: true }, [rules.email(), rules.unique({ table: 'users', column: 'email' })]),
        senha: schema.string({}, [rules.minLength(6)]),
        marca: schema.object().members({
          nome: schema.string({ trim: true }),
          segmento: schema.string.optional(),
          ...marcaSchema,
        }),
      }),
      messages: {
        'email.unique': 'Este e-mail já tem uma conta',
        'senha.minLength': 'A senha precisa de pelo menos 6 caracteres',
      },
    })

    const { tenant, user } = await Database.transaction(async (trx) => {
      const base = slugify(dados.marca.nome)
      let slug = base
      for (let n = 2; await Tenant.query({ client: trx }).where('slug', slug).first(); n++) {
        slug = `${base}-${n}`
      }

      const { nome, segmento, corPrimaria, corDestaque, chavePix, cidadePix, mensagemRecibo, ...visual } = dados.marca
      const tenant = await Tenant.create(
        {
          ...visual,
          slug,
          nome,
          segmento: segmento ?? 'cafeteria',
          corPrimaria: corPrimaria ?? '#0000FF',
          corDestaque: corDestaque ?? '#FF4F1F',
          chavePix: chavePix ?? null,
          cidadePix: cidadePix ?? null,
          mensagemRecibo: mensagemRecibo ?? null,
          onboarding: { marca: true },
        },
        { client: trx }
      )
      await tenant.refresh()
      const user = await User.create(
        { tenantId: tenant.id, nome: dados.nome, email: dados.email, password: dados.senha, papel: 'dono' },
        { client: trx }
      )
      return { tenant, user }
    })

    const token = await auth.use('api').generate(user, { expiresIn: '30 days' })
    return { token: token.token, user, tenant }
  }

  public async login({ request, auth, response }: HttpContextContract) {
    const { email, senha } = request.only(['email', 'senha'])
    try {
      const token = await auth.use('api').attempt(email, senha, { expiresIn: '30 days' })
      const tenant = await Tenant.findOrFail(auth.user!.tenantId)
      return { token: token.token, user: auth.user, tenant }
    } catch {
      return response.unauthorized({ message: 'E-mail ou senha inválidos' })
    }
  }

  public async eu({ auth }: HttpContextContract) {
    const tenant = await Tenant.findOrFail(auth.user!.tenantId)
    return { user: auth.user, tenant }
  }

  public async logout({ auth }: HttpContextContract) {
    await auth.use('api').revoke()
    return { ok: true }
  }
}
