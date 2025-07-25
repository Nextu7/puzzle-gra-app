import { json } from "@remix-run/node";
import { MonitoringService } from "../services/monitoring.server";

export const loader = async ({ request }) => {
  try {
    const healthStatus = await MonitoringService.checkDatabaseHealth();
    
    const status = healthStatus.database === 'healthy' ? 200 : 503;
    
    return json({
      status: healthStatus.database,
      timestamp: healthStatus.timestamp,
      details: {
        sessionCount: healthStatus.sessionCount,
        tablesCount: healthStatus.tables,
        version: "1.0.0"
      }
    }, { status });
    
  } catch (error) {
    await MonitoringService.logError(error, {
      endpoint: 'api/health',
      request: MonitoringService.formatRequestInfo(request)
    });
    
    return json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
};