import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { bootstrapDatabaseIfConfigured } from './server/db/bootstrap.ts';
import { getPostgresConfigStatus, isDatabaseConnectionError } from './server/db/pool.ts';
import { attachOptionalAuth, verifyCsrfOrigin } from './server/middleware/auth.ts';
import authRoutes from './server/routes/authRoutes.ts';
import publicRoutes from './server/routes/publicRoutes.ts';
import applicationRoutes from './server/routes/applicationRoutes.ts';
import questionRoutes from './server/routes/questionRoutes.ts';
import notificationRoutes from './server/routes/notificationRoutes.ts';
import adminRoutes from './server/routes/adminRoutes.ts';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  const pgStatus = getPostgresConfigStatus();
  if (pgStatus.errorMessage) {
    console.warn(`[BAUST SAMS] ${pgStatus.errorMessage}`);
  } else if (!pgStatus.configured) {
    console.info('[BAUST SAMS] PostgreSQL not configured — running in read-only catalog & Demo Preview mode.');
  } else {
    await bootstrapDatabaseIfConfigured();
  }

  app.set('trust proxy', true);
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use('/api', verifyCsrfOrigin);
  app.use('/api', attachOptionalAuth);

  // Health & PostgreSQL configuration status (no credentials exposed)
  app.get('/api/health', (_req, res) => {
    const status = getPostgresConfigStatus();
    res.json({
      ok: true,
      postgresConfigured: status.configured,
      partialConfig: status.partial,
      missingVars: status.missingVars,
      invalidVars: status.invalidVars,
    });
  });

  // REST API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/questions', questionRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Multer, PostgreSQL connectivity, and API error handler
  app.use('/api', (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('API Error:', err);
    if (isDatabaseConnectionError(err)) {
      res.status(503).json({
        error: 'Database service unavailable. Verify PostgreSQL connection settings.',
      });
      return;
    }
    res.status(400).json({ error: err.message || 'Invalid API request.' });
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BAUST SAMS server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start BAUST SAMS server:', err);
  process.exit(1);
});
