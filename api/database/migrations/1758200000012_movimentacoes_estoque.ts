import BaseSchema from '@ioc:Adonis/Lucid/Schema'

/**
 * Livro-razão do estoque. Toda alteração de saldo gera uma linha aqui,
 * o que permite auditoria, relatório de perdas e cálculo de consumo médio.
 */
export default class extends BaseSchema {
  protected tableName = 'movimentacoes_estoque'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('tenant_id').unsigned().notNullable().references('tenants.id').onDelete('CASCADE')
      table.integer('insumo_id').unsigned().notNullable().references('insumos.id').onDelete('CASCADE')
      table.integer('user_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.integer('venda_id').unsigned().nullable().references('vendas.id').onDelete('SET NULL')
      // entrada | venda | perda | ajuste | estorno
      table.string('tipo').notNullable()
      table.decimal('quantidade', 14, 3).notNullable()
      table.decimal('custo_unitario', 14, 4).notNullable().defaultTo(0)
      table.decimal('saldo_apos', 14, 3).notNullable()
      table.string('motivo').nullable()
      table.timestamp('created_at', { useTz: true })
      table.index(['tenant_id', 'insumo_id', 'created_at'])
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
