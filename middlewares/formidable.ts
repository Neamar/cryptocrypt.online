import Busboy from 'busboy';
import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Busboy middleware for parsing multipart/form-data
 * Attaches parsed fields to ctx.request.body and files to ctx.request.files
 */
export const formidableMiddleware = async (ctx, next) => {
  // Only parse if content-type is multipart/form-data
  const contentType = ctx.get('content-type');
  if (!contentType || !contentType.includes('multipart/form-data')) {
    await next();
    return;
  }

  // Initialize request body and files for multipart requests
  ctx.request.body = ctx.request.body || {};
  ctx.request.files = {};

  // Parse the multipart form
  await new Promise((resolve, reject) => {
    const bb = Busboy({ headers: ctx.headers });
    const filePromises = [];

    // Handle form fields
    bb.on('field', (fieldname, val) => {
      ctx.request.body[fieldname] = val;
    });

    // Handle file uploads
    bb.on('file', (fieldname, file, info) => {
      const filename = info.filename;
      let fileSize = 0;
      const tmpFile = join(tmpdir(), `busboy-${randomBytes(8).toString('hex')}`);
      const chunks = [];

      // Collect all chunks
      file.on('data', (chunk) => {
        chunks.push(chunk);
        fileSize += chunk.length;
      });

      // Write file once all chunks are received
      const filePromise = new Promise((fileResolve, fileReject) => {
        file.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            await writeFile(tmpFile, buffer);
            ctx.request.files[fieldname] = {
              name: filename,
              path: tmpFile,
              size: fileSize,
            };
            fileResolve();
          } catch (err) {
            fileReject(err);
          }
        });

        file.on('error', (err) => {
          fileReject(err);
        });
      });

      filePromises.push(filePromise);
    });

    bb.on('close', async () => {
      try {
        // Wait for all file writes to complete
        await Promise.all(filePromises);
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    bb.on('error', (err) => {
      reject(err);
    });

    // Pipe the request into busboy
    ctx.req.pipe(bb);
  });

  // Continue to next middleware
  await next();
};
