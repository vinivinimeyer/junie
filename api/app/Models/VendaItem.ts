import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import { decimal } from './helpers'

export default class VendaItem extends BaseModel {
  public static table = 'venda_itens'

  @column({ isPrimary: true })
  public id: number

  @column()
  public vendaId: number

  @column()
  public produtoId: number | null

  @column()
  public nome: string

  @column()
  public quantidade: number

  @column(decimal)
  public precoUnitario: number

  @column(decimal)
  public custoUnitario: number
}
