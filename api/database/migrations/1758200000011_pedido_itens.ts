import BaseSchema from '@ioc:Adonis/Lucid/Schema'

/**
 * Unifica `compras_mesas` e `pedidos` do Logico: o mesmo registro é a
 * comanda da mesa e o ticket da cozinha. Ao fechar a mesa, recebe venda_id.
 */
export default class extends BaseSchema {
  protected tableName = 'pedido_itens'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('tenant_id').unsigned().notNullable().references('tenants.id').onDelete('CASCADE')
      table.integer('mesa_id').unsigned().notNullable().references('mesas.id').onDelete('CASCADE')
      table.integer('produto_id').unsigned().notNullable().references('produtos.id').onDelete('CASCADE')
      table.integer('venda_id').unsigned().nullable().references('vendas.id').onDelete('SET NULL')
      table.integer('quantidade').notNullable()
      table.decimal('preco_unitario', 12, 2).notNullable()
      table.string('observacao').nullable()
      table.string('status').notNullable().defaultTo('novo')
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
