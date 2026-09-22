/**
 * Gera o "Pix Copia e Cola" (BR Code estático, padrão EMV do Banco Central)
 * com a chave de cada cliente. No Logico a chave e o nome estavam fixos na
 * URL de um serviço externo.
 */
function campo(id, valor) {
  return id + String(valor.length).padStart(2, '0') + valor
}

function crc16(payload) {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0')
}

const limpar = (texto, max) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, max) || 'LOJA'

export function payloadPix({ chave, nome, cidade, valor, txid = '***' }) {
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', chave.trim())
  const semCrc =
    campo('00', '01') +
    campo('26', conta) +
    campo('52', '0000') +
    campo('53', '986') +
    (valor ? campo('54', Number(valor).toFixed(2)) : '') +
    campo('58', 'BR') +
    campo('59', limpar(nome, 25)) +
    campo('60', limpar(cidade || 'Sao Paulo', 15)) +
    campo('62', campo('05', txid)) +
    '6304'
  return semCrc + crc16(semCrc)
}
