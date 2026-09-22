import BaseSchema from '@ioc:Adonis/Lucid/Schema'

/**
 * Tenant = cada marca que usa a plataforma white label. Guarda a identidade
 * visual que o onboarding de customização configura.
 */
export default class extends BaseSchema {
  protected tableName = 'tenants'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('slug').notNullable().unique()
      table.string('nome').notNullable()
      table.string('segmento').notNullable().defaultTo('cafeteria')
      table.text('logo').nullable()
      table.string('cor_primaria').notNullable().defaultTo('#0000FF')
      table.string('cor_destaque').notNullable().defaultTo('#FF4F1F')
      table.string('tema').notNullable().defaultTo('escuro')
      table.string('fonte').notNullable().defaultTo('DIN 2014')
      table.string('cantos').notNullable().defaultTo('reto')
      table.string('chave_pix').nullable()
      table.string('cidade_pix').nullable()
      table.string('mensagem_recibo').nullable()
      table.text('onboarding').notNullable().defaultTo('{}')
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
