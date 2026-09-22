import { DateTime } from 'luxon'
import { BaseModel, belongsTo, BelongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import Fornecedor from './Fornecedor'
import { boolean, decimal } from './helpers'

export const UNIDADES = ['un', 'kg', 'g', 'l', 'ml'] as const

export default class Insumo extends BaseModel {
  public static table = 'insumos'

  @column({ isPrimary: true })
  public id: number

  @column()
  public tenantId: number

  @column()
  public fornecedorId: number | null

  @column()
  public nome: string

  @column()
  public unidade: typeof UNIDADES[number]

  @column(decimal)
  public quantidade: number

  @column(decimal)
  public estoqueMinimo: number

  @column(decimal)
  public custoUnitario: number

  @column(boolean)
  public ativo: boolean

  @belongsTo(() => Fornecedor)
  public fornecedor: BelongsTo<typeof Fornecedor>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
