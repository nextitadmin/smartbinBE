import * as crypto from 'crypto';
import { customAlphabet, nanoid } from 'nanoid';
import * as bcrypt from 'bcrypt';
import { access, readFileSync } from 'fs';
import { join } from 'path';
import * as nunjucks from 'nunjucks';
// import { CustomerAttributes } from '../../models/customer.model';
import { JwtService } from '@nestjs/jwt';

export const encoder = {
  encode: (data: string, encoding: BufferEncoding = 'base64') => {
    return Buffer.from(data, 'utf8').toString(encoding);
  },
  decode: (encoded: string, encoding: BufferEncoding = 'base64') => {
    return Buffer.from(encoded, encoding).toString('utf8');
  },
};

type Chars = 'alphabet' | 'number' | 'alphanum' | 'any';
export const generateRandomChars = (
  length = 16,
  chars: Chars = 'alphanum',
): string => {
  const lowerAlpha = Array(26)
    .fill(null)
    .map((_, i) => String.fromCharCode(i + 97))
    .join('');
  const upperAlpha = lowerAlpha.toUpperCase();
  const num = '0123456789';

  switch (chars) {
    case 'alphabet':
      return customAlphabet(`${lowerAlpha}${upperAlpha}`)(length);
    case 'number':
      return customAlphabet(`${num}`)(length);
    case 'any':
      return nanoid(length);
    default:
      return customAlphabet(`${num}${lowerAlpha}${upperAlpha}`)(length);
  }
};

export const sha256 = (data: string) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

export const comparePassword = (password: string, customerPassword: string) => {
  return bcrypt.compareSync(password, customerPassword);
};

export const getHashedPassword = (password: string) => {
  return bcrypt.hashSync(password, 10);
};

export const getCustomerToken = (
  customer: Partial<any> & { accessType?: string },
  jwtService: JwtService,
) => {
  const payload = {
    email: customer.email,
    sub: {
      id: String(customer._id),
      tag: customer.tag,
      status: customer.status,
      ...(customer.accessType && { accessType: customer.accessType }),
    },
  };
  return jwtService.sign(payload);
};

export const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

export const compileTemplateWithData = (templateName: string, data: any) => {
  const templateString = readFileSync(
    join(__dirname, `../../../assets/${templateName}.html`),
  ).toString();

  const compiledData = nunjucks.renderString(templateString, data);
  return compiledData;
};

export const parseAmountToNumber = (amount: string) => {
  return Number(amount.replace(/[^0-9.-]+/g, ''));
};

export const formatTimestamp = (timestamp: Date): string => {
  const date = new Date(timestamp);

  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12 || 12; // Convert to 12-hour format

  const ordinalSuffix = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return `${ordinalSuffix(day)} ${month} ${year} ${hours}:${minutes
    .toString()
    .padStart(2, '0')}${ampm}`;
};

export const formatCustomDate = (dateString: string): string => {
  const date = new Date(dateString);

  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();

  const ordinalSuffix = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return `${ordinalSuffix(day)} ${month} ${year}`;
};

export const formatCustomTime = (time: string): string => {
  const date = new Date(time);

  const hours24 = date.getHours();
  const minutes = date.getMinutes();

  const hours12 = hours24 % 12 || 12;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';

  return `${hours12}:${minutes.toString().padStart(2, '0')}${ampm}`;
};

export function redactObject<T>(
  obj: T,
  keysToRedact: string[],
  replacement = '******',
): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      redactObject(item, keysToRedact, replacement),
    ) as unknown as T;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (keysToRedact.includes(key)) {
      result[key] = replacement;
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactObject(value, keysToRedact, replacement);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
