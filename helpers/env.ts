export const isProd = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';

// Read into a local first, so the exported `secret` is typed `string` (not `string | undefined`):
// the throw below guarantees it is set, but TypeScript doesn't narrow module-level exports.
const maybeSecret = process.env.SECRET_KEY;
if (!maybeSecret) {
  throw new Error("SECRET_KEY must be defined with a random stable string");
}
export const secret: string = maybeSecret;
