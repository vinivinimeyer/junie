import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { AuthenticationException } from '@adonisjs/auth/build/standalone'
import type { GuardsList } from '@ioc:Adonis/Addons/Auth'

/**
 * Garante que a requisição tem um token válido. Todas as rotas da operação
 * passam por aqui; o tenant vem sempre do usuário autenticado, nunca da URL
 * (no Logico o `unidade_id` vinha da query string).
 */
export default class AuthMiddleware {
  protected redirectTo = '/login'

  protected async authenticate(auth: HttpContextContract['auth'], guards: (keyof GuardsList)[]) {
    for (const guard of guards) {
      if (await auth.use(guard).check()) {
        auth.defaultGuard = guard
        return true
      }
    }

    throw new AuthenticationException('Não autenticado', 'E_UNAUTHORIZED_ACCESS', guards[0], this.redirectTo)
  }

  public async handle(
    { auth }: HttpContextContract,
    next: () => Promise<void>,
    customGuards: (keyof GuardsList)[]
  ) {
    const guards = customGuards.length ? customGuards : [auth.name]
    await this.authenticate(auth, guards)
    await next()
  }
}
