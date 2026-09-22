import { DateTime } from 'luxon'
import {
  BaseModel,
  belongsTo,
  BelongsTo,
  column,
  computed,
  manyToMany,
  ManyToMany,
} from '@ioc:Adonis/Lucid/Orm'
import Categoria from './Categoria'
import Insumo from './Insumo'
import { boolean, decimal } from './helpers'

export default class Produto extends BaseModel {
  public static table = 'produtos'

  @column({ isPrimary: true })
  public id: number

  @column()
  public tenantId: number

  @column()
  public categoriaId: number

  @column()
  public nome: string

  @column()
  public descricao: string | null

  @column(decimal)
  public preco: number

  @column(decimal)
  public custoManual: number | null

  @column()
  public ordem: number

  @column(boolean)
  public ativo: boolean

  @belongsTo(() => Categoria)
  public categoria: BelongsTo<typeof Categoria>

  @manyToMany(() => Insumo, {
    pivotTable: 'ficha_tecnica',
    pivotColumns: ['quantidade'],
    pivotTimestamps: false,
  })
  public ficha: ManyToMany<typeof Insumo>

  /**
   * Custo real do produto: soma da ficha técnica pelo custo médio atual de
   * cada insumo. Sem ficha, cai no custo manual.
   */
  @computed()
  public get custo(): number {
    const ficha = this.$preloaded.ficha as Insumo[] | undefined
    if (ficha && ficha.length) {
      const total = ficha.reduce(
        (soma, insumo) => soma + Number(insumo.$extras.pivot_quantidade) * insumo.custoUnitario,
        0
      )
      return Math.round(total * 10000) / 10000
    }
    return this.custoManual ?? 0
  }

  @computed()
  public get margem(): number | null {
    if (!this.preco) return null
    return Math.round(((this.preco - this.custo) / this.preco) * 1000) / 10
  }

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
