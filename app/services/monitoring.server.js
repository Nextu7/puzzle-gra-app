import prisma from "../db.server";

export class MonitoringService {
  static async logAuthEvent(eventType, details) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      type: eventType,
      ...details
    };

    // Console log for immediate debugging
    console.log(`[AUTH-${eventType}] ${timestamp}:`, JSON.stringify(details, null, 2));

    // Store in database for historical analysis (optional)
    try {
      // You could add an AuthLog model to store these events
      // For now, we'll just use console logging
    } catch (error) {
      console.error('Failed to store auth log:', error);
    }
  }

  static async logError(error, context = {}) {
    const timestamp = new Date().toISOString();
    const errorDetails = {
      timestamp,
      message: error.message,
      stack: error.stack,
      context
    };

    console.error(`[ERROR] ${timestamp}:`, errorDetails);
  }

  static async checkDatabaseHealth() {
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;
      
      // Check session count
      const sessionCount = await prisma.session.count();
      
      // Check if migrations are up to date
      const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
      
      const healthStatus = {
        timestamp: new Date().toISOString(),
        database: 'healthy',
        sessionCount,
        tables: tables.length,
        tablesFound: tables.map(t => t.name)
      };

      console.log('[HEALTH-CHECK]', healthStatus);
      return healthStatus;
    } catch (error) {
      const healthStatus = {
        timestamp: new Date().toISOString(),
        database: 'unhealthy',
        error: error.message
      };

      console.error('[HEALTH-CHECK]', healthStatus);
      return healthStatus;
    }
  }

  static formatRequestInfo(request) {
    return {
      url: request.url,
      method: request.method,
      userAgent: request.headers.get('User-Agent'),
      origin: request.headers.get('Origin'),
      shopifyShop: request.headers.get('X-Shopify-Shop-Domain'),
      timestamp: new Date().toISOString()
    };
  }

  static async trackApiCall(shop, endpoint, success = true, duration = 0) {
    const logData = {
      shop,
      endpoint,
      success,
      duration,
      timestamp: new Date().toISOString()
    };

    console.log(`[API-CALL] ${shop}:${endpoint} - ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`);

    // Could be extended to store API call statistics in database
  }
}

// Enhanced AuthService with monitoring
export class EnhancedAuthService {
  static async validateShopifySessionWithLogging(request) {
    const startTime = Date.now();
    const requestInfo = MonitoringService.formatRequestInfo(request);

    try {
      await MonitoringService.logAuthEvent('SESSION_VALIDATION_START', requestInfo);

      const { authenticate } = await import("../shopify.server");
      const { session } = await authenticate.admin(request);
      
      const duration = Date.now() - startTime;
      
      await MonitoringService.logAuthEvent('SESSION_VALIDATION_SUCCESS', {
        shop: session.shop,
        duration,
        sessionId: session.id
      });

      await MonitoringService.trackApiCall(session.shop, 'auth/validate', true, duration);

      return {
        isValid: true,
        shop: session.shop,
        session
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await MonitoringService.logError(error, {
        ...requestInfo,
        duration,
        operation: 'SESSION_VALIDATION'
      });

      await MonitoringService.logAuthEvent('SESSION_VALIDATION_FAILED', {
        error: error.message,
        duration,
        ...requestInfo
      });

      return {
        isValid: false,
        error: error.message
      };
    }
  }

  static async requireAuthWithLogging(request) {
    const auth = await this.validateShopifySessionWithLogging(request);
    if (!auth.isValid) {
      await MonitoringService.logAuthEvent('AUTH_REQUIRED_FAILED', {
        error: auth.error,
        request: MonitoringService.formatRequestInfo(request)
      });
      throw new Response("Unauthorized", { status: 401 });
    }
    return auth;
  }
}