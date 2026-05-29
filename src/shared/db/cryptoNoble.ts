import { scrypt } from '@noble/hashes/scrypt.js'
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils.js'
import type { CredentialCrypto } from '@/shared/db/cryptoApi'

const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, dkLen: 64 } as const

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

function parseStoredHash(stored: string): { salt: Uint8Array; expected: Uint8Array } | null {
  const sep = stored.indexOf(':')
  if (sep <= 0) return null
  const saltHex = stored.slice(0, sep)
  const hashHex = stored.slice(sep + 1)
  if (!saltHex || !hashHex) return null
  try {
    return { salt: hexToBytes(saltHex), expected: hexToBytes(hashHex) }
  } catch {
    return null
  }
}

export const nobleCredentialCrypto: CredentialCrypto = {
  hashCredential(secret: string): string {
    const salt = randomBytes(16)
    const password = new TextEncoder().encode(secret)
    const derived = new Uint8Array(scrypt(password, salt, SCRYPT_OPTS))
    return `${bytesToHex(salt)}:${bytesToHex(derived)}`
  },
  verifyCredential(secret: string, stored: string): boolean {
    const parsed = parseStoredHash(stored)
    if (!parsed) return false
    const password = new TextEncoder().encode(secret)
    const derived = new Uint8Array(scrypt(password, parsed.salt, SCRYPT_OPTS))
    return timingSafeEqual(derived, parsed.expected)
  },
}
