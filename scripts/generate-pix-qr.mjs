/**
 * Gera o payload BRCode (PIX estático) e o QR code PNG.
 * Uso: node scripts/generate-pix-qr.mjs
 *
 * Referência: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
 */
import QRCode from 'qrcode'
import { writeFileSync } from 'fs'

// ── Configuração ────────────────────────────────────
const PIX_KEY = '22890078-d19c-4a4f-92f1-d9fc9233c2f0'
const MERCHANT_NAME = 'Forja'
const MERCHANT_CITY = 'SAO PAULO'
// ────────────────────────────────────────────────────

function tlv(id, value) {
  return id + String(value.length).padStart(2, '0') + value
}

function crc16ccitt(str) {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc = crc << 1
      }
      crc &= 0xffff
    }
  }
  return crc
}

function buildPixPayload(key, name, city) {
  let payload = ''
  payload += tlv('00', '01') // Payload Format Indicator
  // Merchant Account Information (PIX)
  let mai = ''
  mai += tlv('00', 'br.gov.bcb.pix') // GUI
  mai += tlv('01', key) // Chave PIX
  payload += tlv('26', mai)
  payload += tlv('52', '0000') // MCC
  payload += tlv('53', '986')  // Moeda (BRL)
  payload += tlv('58', 'BR')   // País
  payload += tlv('59', name)   // Nome
  payload += tlv('60', city)   // Cidade
  // Additional Data Field
  let adf = ''
  adf += tlv('05', '***') // Reference Label
  payload += tlv('62', adf)
  // CRC16 placeholder
  payload += '6304'
  const crc = crc16ccitt(payload)
  payload += crc.toString(16).toUpperCase().padStart(4, '0')
  return payload
}

const payload = buildPixPayload(PIX_KEY, MERCHANT_NAME, MERCHANT_CITY)

console.log('PIX Payload (copia e cola):')
console.log(payload)
console.log()

// Gerar PNG
const pngBuffer = await QRCode.toBuffer(payload, {
  type: 'png',
  width: 300,
  margin: 2,
  color: { dark: '#000000', light: '#ffffff' },
  errorCorrectionLevel: 'M',
})

writeFileSync('public/pix-qr.png', pngBuffer)
console.log('QR code salvo em public/pix-qr.png')
console.log()
console.log('Chave PIX:', PIX_KEY)
