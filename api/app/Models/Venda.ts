import { DateTime } from 'luxon'
import { BaseModel, column, computed, hasMany, HasMany } from '@ioc:Adonis/Lucid/Orm'
import VendaItem from './VendaItem'
import { decimal } from './helpers'

export const FORMAS_PAGAMENTO = ['dinheiro', 'cartao', 'pix'] as const

export default class Venda extends BaseModel {
  public static table = 'vendas'

  @column({ isPrimary: true })
  public id: number

  @column()
  public tenantId: number

  @column()
  public userId: number | null

  @column()
  public mesaId: number | null

  @column()
  public rotulo: string | null

  @column(decimal)
  public total: number

  @column(decimal)
  public custo: number

  @column()
  public formaPagamento: typeof FORMAS_PAGAMENTO[number]

  @column()
  public status: 'concluida' | 'cancelada'

  @computed()
  public get lucro(): number {
    return Math.round((this.total - this.custo) * 100) / 100
  }

  @hasMany(() => VendaItem)
  public itens: HasMany<typeof VendaItem>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
