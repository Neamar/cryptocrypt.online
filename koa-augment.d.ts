// Type declarations for the custom properties our middlewares attach to the Koa context.
// Purely type-level: this file is never loaded at runtime.
import type { Logger } from 'pino';
import type { CryptView } from './middlewares/crypt.ts';

declare module 'koa' {
  interface BaseContext {
    // Render a nunjucks view into ctx.body — middlewares/template.ts
    render(view: string, opts?: Record<string, unknown>): void;
    // Set a message toast for the next request — middlewares/toast.ts
    setToast(toast: string, level?: 'info' | 'warn' | 'error'): void;
    toast: string | undefined;
    toastLevel: string;
    // Pino logger — middlewares/logger.ts
    log: Logger;
    // CSP nonce for inline scripts/styles — middlewares/csp.ts
    nonce: string;
    // The crypt for the current /crypts/:uuid route — middlewares/crypt.ts (getCrypt).
    // Declared non-optional as a pragmatic tradeoff: it is only read after getCrypt ran.
    crypt: CryptView;
  }

  interface Request {
    // Uploaded files, only set on multipart/form-data requests — middlewares/formidable.ts
    files?: Record<string, { name: string; path: string; size: number }>;
  }
}
