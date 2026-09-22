import { DateTime } from 'luxon'
import { BaseModel, belongsTo, BelongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import Insumo from './Insumo'
import { decimal } from './helpers'

export const TIPOS_MOVIMENTACAO = ['entrada', 'venda', 'perda', 'ajuste', 'estorno'] as const
export type TipoMovimentacao = typeof TIPOS_MOVIMENTACAO[number]

export default class MovimentacaoEstoque extends BaseModel {
  public static table = 'movimentacoes_estoque'

  @column({ isPrimary: true })
  public id: number

  @column()
  public tenantId: number

  @column()
  public insumoId: number

  @column()
  public userId: number | null

  @column()
  public vendaId: number | null

  @column()
  public tipo: TipoMovimentacao

  @column(decimal)
  public quantidade: number

  @column(decimal)
  public custoUnitario: number

  @column(decimal)
  public saldoApos: number

  @column()
  public motivo: string | null

  @belongsTo(() => Insumo)
  public insumo: BelongsTo<typeof Insumo>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime
}
