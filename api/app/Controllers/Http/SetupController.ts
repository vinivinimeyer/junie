import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import Categoria from 'App/Models/Categoria'
import Fornecedor from 'App/Models/Fornecedor'
import Insumo, { UNIDADES } from 'App/Models/Insumo'
import Mesa from 'App/Models/Mesa'
import Produto from 'App/Models/Produto'
import Tenant from 'App/Models/Tenant'
import EstoqueService from 'App/Services/EstoqueService'

/**
 * Importa um template de operação (cafeteria, bar, restaurante...) de uma
 * vez: fornecedores, insumos com saldo inicial, categorias, produtos com
 * ficha técnica e mesas. Os templates ficam no front (web/src/data/templates.js).
 */
export default class SetupController {
  public async importar({ auth, request }: HttpContextContract) {
    const user = auth.user!
    const tenantId = user.tenantId
    const dados = await request.validate({
      schema: schema.create({
        fornecedores: schema.array.optional().members(
          schema.object().members({
            nome: schema.string({ trim: true }),
            telefone: schema.string.optional(),
            prazoEntregaDias: schema.number.optional(),
          })
        ),
        insumos: schema.array.optional().members(
          schema.object().members({
            nome: schema.string({ trim: true }),
            unidade: schema.enum(UNIDADES),
            quantidade: schema.number.optional(),
            estoqueMinimo: schema.number.optional(),
            custoUnitario: schema.number.optional(),
            fornecedor: schema.string.optional(),
          })
        ),
        categorias: schema.array.optional().members(
          schema.object().members({
            nome: schema.string({ trim: true }),
            enviaCozinha: schema.boolean.optional(),
            produtos: schema.array.optional().members(
              schema.object().members({
                nome: schema.string({ trim: true }),
                descricao: schema.string.optional(),
                preco: schema.number(),
                custoManual: schema.number.optional(),
                ficha: schema.array.optional().members(
                  schema.object().members({ insumo: schema.string(), quantidade: schema.number() })
                ),
              })
            ),
          })
        ),
        mesas: schema.number.optional(),
      }),
    })

    await Database.transaction(async (trx) => {
      const fornecedores = new Map<string, number>()
      for (const f of dados.fornecedores ?? []) {
        const criado = await Fornecedor.create({ ...f, prazoEntregaDias: f.prazoEntregaDias ?? 2, tenantId }, { client: trx })
        fornecedores.set(f.nome, criado.id)
      }

      const insumos = new Map<string, number>()
      for (const { quantidade, fornecedor, ...i } of dados.insumos ?? []) {
        const insumo = await Insumo.create(
          { ...i, tenantId, quantidade: 0, fornecedorId: fornecedor ? fornecedores.get(fornecedor) ?? null : null },
          { client: trx }
        )
        insumos.set(i.nome, insumo.id)
        if (quantidade) {
          await EstoqueService.movimentar(trx, {
            tenantId,
            insumoId: insumo.id,
            tipo: 'entrada',
            quantidade,
            custoUnitario: i.custoUnitario ?? 0,
            motivo: 'Estoque inicial',
            userId: user.id,
          })
        }
      }

      const ordemBase = Number((await Categoria.query({ client: trx }).where('tenant_id', tenantId).max('ordem as m').first())?.$extras.m ?? -1) + 1
      for (const [ci, c] of (dados.categorias ?? []).entries()) {
        const categoria = await Categoria.create(
          { tenantId, nome: c.nome, enviaCozinha: c.enviaCozinha ?? true, ordem: ordemBase + ci },
          { client: trx }
        )
        for (const [pi, { ficha, ...p }] of (c.produtos ?? []).entries()) {
          const produto = await Produto.create({ ...p, tenantId, categoriaId: categoria.id, ordem: pi, ativo: true }, { client: trx })
          const linhas = (ficha ?? []).filter((f) => insumos.has(f.insumo))
          if (linhas.length) {
            await produto.related('ficha').attach(
              Object.fromEntries(linhas.map((f) => [insumos.get(f.insumo)!, { quantidade: f.quantidade }]))
            )
          }
        }
      }

      if (dados.mesas) {
        const ultima = Number((await Mesa.query({ client: trx }).where('tenant_id', tenantId).max('numero as m').first())?.$extras.m ?? 0)
        await Mesa.createMany(
          Array.from({ length: dados.mesas }, (_, i) => ({ tenantId, numero: ultima + i + 1 })),
          { client: trx }
        )
      }
    })

    return Tenant.findOrFail(tenantId)
  }
}
