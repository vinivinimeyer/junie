import { DateTime } from 'luxon'
import Hash from '@ioc:Adonis/Core/Hash'
import { BaseModel, beforeSave, belongsTo, BelongsTo, column } from '@ioc:Adonis/Lucid/Orm'
import Tenant from './Tenant'

export default class User extends BaseModel {
  public static table = 'users'

  @column({ isPrimary: true })
  public id: number

  @column()
  public tenantId: number

  @column()
  public nome: string

  @column()
  public email: string

  @column({ serializeAs: null })
  public password: string

  @column()
  public papel: 'dono' | 'gerente' | 'atendente'

  @column({ serializeAs: null })
  public rememberMeToken: string | null

  @belongsTo(() => Tenant)
  public tenant: BelongsTo<typeof Tenant>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @beforeSave()
  public static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await Hash.make(user.password)
    }
  }
}
