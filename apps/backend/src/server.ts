import app from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './utils/logger';
import { startWorkers, stopWorkers } from './workers';
import { registerReviewGrowthAutomationHandlers } from './modules/reviewGrowth/reviewGrowth.automation';

const startServer = async (): Promise<void> => {
  await connectDatabase();
  registerReviewGrowthAutomationHandlers();
  await startWorkers();

  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`, {
      env: config.env,
      apiPrefix: config.apiPrefix,
      workersEnabled: process.env.ENABLE_WORKERS === 'true',
    });
  });

  const shutdown = async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(async () => {
      await stopWorkers();
      await disconnectDatabase();
      logger.info('Shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
