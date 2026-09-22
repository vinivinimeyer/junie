import Env from '@ioc:Adonis/Core/Env'
import Application from '@ioc:Adonis/Core/Application'
import { DatabaseConfig } from '@ioc:Adonis/Lucid/Database'

const databaseConfig: DatabaseConfig = {
  connection: Env.get('DB_CONNECTION', 'sqlite'),

  connections: {
    /*
    | SQLite: usado no desenvolvimento e na demo local, não precisa de servidor.
    */
    sqlite: {
      client: 'better-sqlite3',
      connection: {
        filename: Application.tmpPath('junie.sqlite3'),
      },
      pool: {
        afterCreate: (conn, cb) => {
          conn.pragma('foreign_keys = ON')
          cb()
        },
      },
      migrations: {
        naturalSort: true,
      },
      useNullAsDefault: true,
      healthCheck: false,
      debug: false,
    },

    /*
    | PostgreSQL: produção (mesmo banco usado pelo Logico no Render).
    */
    pg: {
      client: 'pg',
      connection: {
        host: Env.get('PG_HOST'),
        port: Env.get('PG_PORT'),
        user: Env.get('PG_USER'),
        password: Env.get('PG_PASSWORD', ''),
        database: Env.get('PG_DB_NAME'),
        ssl: Env.get('PG_SSL', false) ? { rejectUnauthorized: false } : false,
      },
      migrations: {
        naturalSort: true,
      },
      healthCheck: false,
      debug: false,
    },
  },
}

export default databaseConfig
