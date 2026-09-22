import BaseSchema from '@ioc:Adonis/Lucid/Schema'

/**
 * Ficha técnica: quanto de cada insumo um produto consome.
 * Ex.: Cappuccino = 18 g de café + 150 ml de leite + 1 copo.
 */
export default class extends BaseSchema {
  protected tableName = 'ficha_tecnica'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('produto_id').unsigned().notNullable().references('produtos.id').onDelete('CASCADE')
      table.integer('insumo_id').unsigned().notNullable().references('insumos.id').onDelete('CASCADE')
      table.decimal('quantidade', 14, 3).notNullable()
      table.unique(['produto_id', 'insumo_id'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
