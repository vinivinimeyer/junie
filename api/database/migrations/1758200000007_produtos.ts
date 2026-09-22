import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'produtos'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('tenant_id').unsigned().notNullable().references('tenants.id').onDelete('CASCADE')
      table.integer('categoria_id').unsigned().notNullable().references('categorias.id').onDelete('CASCADE')
      table.string('nome').notNullable()
      table.string('descricao').nullable()
      table.decimal('preco', 12, 2).notNullable().defaultTo(0)
      // Usado só quando o produto não tem ficha técnica (substitui o `lucro` digitado à mão no Logico).
      table.decimal('custo_manual', 12, 4).nullable()
      table.integer('ordem').notNullable().defaultTo(0)
      table.boolean('ativo').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
