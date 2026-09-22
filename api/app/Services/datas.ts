import { DateTime } from 'luxon'
import Database from '@ioc:Adonis/Lucid/Database'

/**
 * Formata datas do jeito que o dialeto do banco armazena, para comparar
 * `created_at` tanto no SQLite (texto) quanto no Postgres (timestamptz).
 */
export function paraBanco(data: DateTime) {
  return data.toFormat(Database.connection().dialect.dateTimeFormat)
}

/** Intervalo [de, até] a partir de strings YYYY-MM-DD; padrão = hoje. */
export function periodo(de?: string, ate?: string) {
  const inicio = de ? DateTime.fromISO(de).startOf('day') : DateTime.now().startOf('day')
  const fim = ate ? DateTime.fromISO(ate).endOf('day') : inicio.endOf('day')
  return { inicio, fim }
}
