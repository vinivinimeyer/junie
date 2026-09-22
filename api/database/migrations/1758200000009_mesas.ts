import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'mesas'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('tenant_id').unsigned().notNullable().references('tenants.id').onDelete('CASCADE')
      table.integer('numero').notNullable()
      table.string('rotulo').nullable()
      table.string('nome_cliente').nullable()
      table.timestamp('aberta_em', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
      table.unique(['tenant_id', 'numero'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
