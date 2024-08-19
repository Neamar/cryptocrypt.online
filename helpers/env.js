export const isProd = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';
export const secret = process.env.SECRET_KEY;

if (!secret) {
  throw new Error("SECRET must be defined with a random stable string");
}
