/**
 * Normalize a phone string for `https://wa.me/<digits>` (country code, no +).
 * Supports common international prefixes; local `05…` → Saudi `9665…`, `09…` (10 digits) → Syrian `9639…`.
 */
export function digitsForWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null
  let d = phone.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)

  if (/^(963|964|965|966|967|968|970|971|972|973|974)/.test(d)) {
    return d.length >= 10 && d.length <= 15 ? d : null
  }

  if (d.startsWith('966')) {
    return d.length >= 11 && d.length <= 15 ? d : null
  }

  // Syrian mobiles often stored as 09xxxxxxxx (10 digits)
  if (d.startsWith('09') && d.length === 10) {
    return `963${d.slice(1)}`
  }

  // Saudi mobiles often 05xxxxxxxx (10 digits)
  if (d.startsWith('05') && d.length === 10) {
    return `966${d.slice(1)}`
  }

  if (d.startsWith('0') && d.length >= 9) {
    d = `966${d.slice(1)}`
  }
  if (d.length < 8 || d.length > 15) return null
  return d
}

export function buildWhatsAppUrl(phoneDigits: string, message: string): string {
  const q = new URLSearchParams({ text: message })
  return `https://wa.me/${phoneDigits}?${q.toString()}`
}

export function buildWhatsAppAppUrl(phoneDigits: string, message: string): string {
  const q = new URLSearchParams({ phone: phoneDigits, text: message })
  return `whatsapp://send?${q.toString()}`
}
