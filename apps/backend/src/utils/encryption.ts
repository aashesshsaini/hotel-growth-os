import crypto from 'crypto';
import { config } from '../config';

const algorithm = 'aes-256-gcm';

const getKey = () =>
  crypto
    .createHash('sha256')
    .update(process.env.CREDENTIAL_ENCRYPTION_KEY || config.jwt.secret)
    .digest();

export const encryptSecret = (value?: string): string | undefined => {
  if (!value) return undefined;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
};

export const decryptSecret = (value?: string): string | undefined => {
  if (!value) return undefined;
  const [ivHex, tagHex, encryptedHex] = value.split(':');
  if (!ivHex || !tagHex || !encryptedHex) return undefined;
  const decipher = crypto.createDecipheriv(algorithm, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]).toString('utf8');
};

export const maskSecret = (value?: string): string | undefined => {
  const decrypted = decryptSecret(value);
  if (!decrypted) return undefined;
  return `••••••••••••${decrypted.slice(-4)}`;
};
