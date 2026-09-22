import BaseSchema from '@ioc:Adonis/Lucid/Schema'

/** Enquadramento da logo no orbe: escala e deslocamento, definidos no onboarding. */
export default class extends BaseSchema {
  protected tableName = 'tenants'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.float('logo_escala').notNullable().defaultTo(1)
      table.float('logo_x').notNullable().defaultTo(0)
      table.float('logo_y').notNullable().defaultTo(0)
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('logo_escala')
      table.dropColumn('logo_x')
      table.dropColumn('logo_y')
    })
  }
}
