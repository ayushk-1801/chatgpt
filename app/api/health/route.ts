
import { databaseService } from '@/services/database';
import { config } from '@/config';
import { createSuccessResponse, withErrorHandling } from '@/middleware/error';

const healthCheck = withErrorHandling(async () => {
  const dbHealth = await databaseService.healthCheck();
  
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.app.env,
    version: config.app.version,
    services: {
      database: dbHealth ? 'healthy' : 'unhealthy',
    },
  };

  const status = dbHealth ? 200 : 503;
  return createSuccessResponse(health, status);
});

export const GET = healthCheck; 