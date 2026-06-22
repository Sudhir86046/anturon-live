import './env';
import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter, type AppRouter } from './trpc/router';
export { type AppRouter } from './trpc/router';
import { createContext } from './trpc/trpc';
import debugRouter from './routes/debug';
import vapiRouter from './routes/vapi-webhook';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// tRPC endpoint
app.use('/api/trpc', createExpressMiddleware({
  router: appRouter,
  createContext,
}));

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'VoiceAI API',
    version: '1.0.0',
    documentation: '/api/trpc',
  });
});

// VAPI webhook + SSE real-time events
app.use('/vapi', vapiRouter);

// Debug routes (development only)
app.use('/debug', debugRouter);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 VoiceAI API server running on port ${PORT}`);
  console.log(`📚 tRPC endpoint: http://localhost:${PORT}/api/trpc`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`🐛 Debug emails: http://localhost:${PORT}/debug/emails`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
