/** PIN hashing compatible with Node scrypt (N=16384, r=8, p=1, dkLen=64). */

export type CredentialCrypto = {
  hashCredential: (secret: string) => string
  verifyCredential: (secret: string, stored: string) => boolean
}
