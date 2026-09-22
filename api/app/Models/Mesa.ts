import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, HasMany } from '@ioc:Adonis/Lucid/Orm'
import PedidoItem from './PedidoItem'

export default class Mesa extends BaseModel {
  public static table = 'mesas'

  @column({ isPrimary: true })
  public id: number

  @column()
  public tenantId: number

  @column()
  public numero: number

  @column()
  public rotulo: string | null

  @column()
  public nomeCliente: string | null

  @column.dateTime()
  public abertaEm: DateTime | null

  /** Só os itens ainda não pagos (sem venda). */
  @hasMany(() => PedidoItem, { onQuery: (q) => q.whereNull('venda_id') })
  public itens: HasMany<typeof PedidoItem>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
