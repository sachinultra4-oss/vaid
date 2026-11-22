import type { Request, Response } from 'express';
import { createServerApp } from '../server.ts';

let cachedAppPromise: ReturnType<typeof createServerApp> | null = null;

export default async function handler(req: Request, res: Response) {
  if (!cachedAppPromise) {
    cachedAppPromise = createServerApp({ skipFrontend: true });
  }
  const app = await cachedAppPromise;
  return app(req, res);
}
