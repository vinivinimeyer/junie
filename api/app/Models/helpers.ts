/**
 * Postgres devolve DECIMAL como string e SQLite devolve booleano como 0/1.
 * Estes conversores deixam o JSON igual nos dois bancos.
 */
export const decimal = {
  consume: (value: unknown) => (value === null || value === undefined ? value : Number(value)),
}

export const boolean = {
  consume: (value: unknown) => Boolean(Number(value)) || value === true || value === 'true',
}
