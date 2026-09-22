import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, HasMany } from '@ioc:Adonis/Lucid/Orm'
import Produto from './Produto'
import { boolean } from './helpers'

export default class Categoria extends BaseModel {
  public static table = 'categorias'

  @column({ isPrimary: true })
  public id: number

  @column()
  public tenantId: number

  @column()
  public nome: string

  @column()
  public ordem: number

  @column(boolean)
  public enviaCozinha: boolean

  @hasMany(() => Produto)
  public produtos: HasMany<typeof Produto>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
