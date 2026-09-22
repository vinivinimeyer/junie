import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, HasMany } from '@ioc:Adonis/Lucid/Orm'
import User from './User'

export type Onboarding = {
  marca?: boolean
  cardapio?: boolean
  mesas?: boolean
  estoque?: boolean
}

export default class Tenant extends BaseModel {
  public static table = 'tenants'

  @column({ isPrimary: true })
  public id: number

  @column()
  public slug: string

  @column()
  public nome: string

  @column()
  public segmento: string

  @column()
  public logo: string | null

  @column()
  public logoEscala: number

  @column()
  public logoX: number

  @column()
  public logoY: number

  @column()
  public corPrimaria: string

  @column()
  public corDestaque: string

  @column()
  public tema: string

  @column()
  public fonte: string

  @column()
  public cantos: string

  @column()
  public chavePix: string | null

  @column()
  public cidadePix: string | null

  @column()
  public mensagemRecibo: string | null

  @column({
    prepare: (value: Onboarding) => JSON.stringify(value ?? {}),
    consume: (value: string) => (typeof value === 'string' ? JSON.parse(value || '{}') : value),
  })
  public onboarding: Onboarding

  @hasMany(() => User)
  public users: HasMany<typeof User>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  /** Dados seguros para a tela de login pública (sem PIX nem contatos). */
  public toBranding() {
    return {
      slug: this.slug,
      nome: this.nome,
      logo: this.logo,
      logoEscala: this.logoEscala,
      logoX: this.logoX,
      logoY: this.logoY,
      corPrimaria: this.corPrimaria,
      corDestaque: this.corDestaque,
      tema: this.tema,
      fonte: this.fonte,
      cantos: this.cantos,
    }
  }
}
