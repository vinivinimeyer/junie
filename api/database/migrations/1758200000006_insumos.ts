import BaseSchema from '@ioc:Adonis/Lucid/Schema'

/**
 * Tudo que tem saldo em estoque: matéria-prima (leite, café em grão) e
 * itens de revenda (água, cerveja long neck). O saldo é consequência das
 * movimentações; não deve ser editado direto.
 */
export default class extends BaseSchema {
  protected tableName = 'insumos'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('tenant_id').unsigned().notNullable().references('tenants.id').onDelete('CASCADE')
      table.integer('fornecedor_id').unsigned().nullable().references('fornecedores.id').onDelete('SET NULL')
      table.string('nome').notNullable()
      table.string('unidade').notNullable().defaultTo('un')
      table.decimal('quantidade', 14, 3).notNullable().defaultTo(0)
      table.decimal('estoque_minimo', 14, 3).notNullable().defaultTo(0)
      table.decimal('custo_unitario', 14, 4).notNullable().defaultTo(0)
      table.boolean('ativo').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
