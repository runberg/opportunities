import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto"

function encryptionKey(secret: string): Buffer {
  return createHmac("sha256", secret).update("opportunities credential email").digest()
}

export function sealCredentialEmailBody(body: { text: string; html: string }, secret: string): string {
  const nonce = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), nonce)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(body), "utf8"), cipher.final()])
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString("base64url")
}

export function openCredentialEmailBody(sealed: string, secret: string): { text: string; html: string } {
  const data = Buffer.from(sealed, "base64url")
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), data.subarray(0, 12))
  decipher.setAuthTag(data.subarray(12, 28))
  const body = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8"))
  return { text: body.text, html: body.html }
}
