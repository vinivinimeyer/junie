import { DateTime } from 'luxon'
import { BaseModel, belongsTo, BelongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import Mesa from './Mesa'
import Produto from './Produto'
import { decimal } from './helpers'

export const STATUS_PEDIDO = ['novo', 'preparando', 'pronto', 'entregue'] as const

export default class PedidoItem extends BaseModel {
  public static table = 'pedido_itens'

  @column({ isPrimary: true })
  public id: number

  @column()
  public tenantId: number

  @column()
  public mesaId: number

  @column()
  public produtoId: number

  @column()
  public vendaId: number | null

  @column()
  public quantidade: number

  @column(decimal)
  public precoUnitario: number

  @column()
  public observacao: string | null

  @column()
  public status: typeof STATUS_PEDIDO[number]

  @belongsTo(() => Mesa)
  public mesa: BelongsTo<typeof Mesa>

  @belongsTo(() => Produto)
  public produto: BelongsTo<typeof Produto>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
