import BaseSchema from '@ioc:Adonis/Lucid/Schema'

/**
 * Substitui o `tipo` fixo do Logico (0 CAFÉ, 1 BAR, 2 FOTO, 3 LOJA): cada
 * tenant cria as próprias categorias no onboarding.
 */
export default class extends BaseSchema {
  protected tableName = 'categorias'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('tenant_id').unsigned().notNullable().references('tenants.id').onDelete('CASCADE')
      table.string('nome').notNullable()
      table.integer('ordem').notNullable().defaultTo(0)
      table.boolean('envia_cozinha').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
