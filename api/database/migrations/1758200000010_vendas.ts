import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  public async up() {
    this.schema.createTable('vendas', (table) => {
      table.increments('id')
      table.integer('tenant_id').unsigned().notNullable().references('tenants.id').onDelete('CASCADE')
      table.integer('user_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.integer('mesa_id').unsigned().nullable().references('mesas.id').onDelete('SET NULL')
      table.string('rotulo').nullable()
      table.decimal('total', 12, 2).notNullable()
      table.decimal('custo', 12, 4).notNullable().defaultTo(0)
      table.string('forma_pagamento').notNullable()
      table.string('status').notNullable().defaultTo('concluida')
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
      table.index(['tenant_id', 'created_at'])
    })

    // Snapshot de nome/preço/custo: relatórios antigos não mudam quando o cardápio muda.
    this.schema.createTable('venda_itens', (table) => {
      table.increments('id')
      table.integer('venda_id').unsigned().notNullable().references('vendas.id').onDelete('CASCADE')
      table.integer('produto_id').unsigned().nullable().references('produtos.id').onDelete('SET NULL')
      table.string('nome').notNullable()
      table.integer('quantidade').notNullable()
      table.decimal('preco_unitario', 12, 2).notNullable()
      table.decimal('custo_unitario', 12, 4).notNullable().defaultTo(0)
    })
  }

  public async down() {
    this.schema.dropTable('venda_itens')
    this.schema.dropTable('vendas')
  }
}
