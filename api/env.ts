/*
|--------------------------------------------------------------------------
| Validating Environment Variables
|--------------------------------------------------------------------------
*/

import Env from '@ioc:Adonis/Core/Env'

export default Env.rules({
  HOST: Env.schema.string({ format: 'host' }),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  DRIVE_DISK: Env.schema.enum(['local'] as const),
  DB_CONNECTION: Env.schema.enum(['sqlite', 'pg'] as const),
  PG_HOST: Env.schema.string.optional({ format: 'host' }),
  PG_PORT: Env.schema.number.optional(),
  PG_USER: Env.schema.string.optional(),
  PG_PASSWORD: Env.schema.string.optional(),
  PG_DB_NAME: Env.schema.string.optional(),
  PG_SSL: Env.schema.boolean.optional(),
})
