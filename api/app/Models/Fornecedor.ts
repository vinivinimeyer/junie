import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Fornecedor extends BaseModel {
  public static table = 'fornecedores'

  @column({ isPrimary: true })
  public id: number

  @column()
  public tenantId: number

  @column()
  public nome: string

  @column()
  public contato: string | null

  @column()
  public telefone: string | null

  @column()
  public prazoEntregaDias: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
