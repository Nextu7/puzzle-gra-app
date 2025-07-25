import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { FirebaseService } from "../services/firebase.server";
import { MonitoringService, EnhancedAuthService } from "../services/monitoring.server";
import { AuthService } from "../services/auth.server";

export const action = async ({ request }) => {
  const startTime = Date.now();
  
  try {
    // Enhanced authentication with logging
    const auth = await EnhancedAuthService.validateShopifySessionWithLogging(request);
    if (!auth.isValid) {
      return json({ 
        success: false, 
        error: "Authentication failed" 
      }, { status: 401 });
    }
    
    const { session } = auth;
    const shop = session.shop;
    
    if (request.method === "POST") {
      const data = await request.json();
      
      // Server-side validation
      const { playerId, productId, difficulty, timeInSeconds } = data;
      
      if (!playerId || !productId || !difficulty || typeof timeInSeconds !== 'number') {
        return json({ 
          success: false, 
          error: "Missing or invalid required fields" 
        }, { status: 400 });
      }

      // Validate difficulty
      const validDifficulties = ['p30', 'p56', 'p99', 'p143', 'p304'];
      if (!validDifficulties.includes(difficulty)) {
        return json({ 
          success: false, 
          error: "Invalid difficulty level" 
        }, { status: 400 });
      }

      // Validate time range (prevent cheating)
      const minTimes = {
        'p30': 2,   // 4 pieces minimum 2 seconds
        'p56': 10,  // 56 pieces minimum 10 seconds  
        'p99': 20,  // 99 pieces minimum 20 seconds
        'p143': 30, // 143 pieces minimum 30 seconds
        'p304': 60  // 304 pieces minimum 60 seconds
      };

      const maxTime = 86400; // 24 hours maximum

      if (timeInSeconds < minTimes[difficulty] || timeInSeconds > maxTime) {
        return json({ 
          success: false, 
          error: "Invalid completion time" 
        }, { status: 400 });
      }

      // Enhanced rate limiting using database
      const rateLimit = await AuthService.validateRateLimit(shop, 'score_submission', 10, 60000);
      if (!rateLimit.allowed) {
        await MonitoringService.logAuthEvent('RATE_LIMIT_EXCEEDED', {
          shop,
          action: 'score_submission',
          resetTime: rateLimit.resetTime
        });
        
        return json({ 
          success: false, 
          error: "Rate limit exceeded. Too many score submissions.",
          resetTime: rateLimit.resetTime
        }, { status: 429 });
      }

      // Save score through Firebase
      const scoreData = {
        customerId: playerId,
        productId,
        difficulty,
        timeInSeconds: Math.floor(timeInSeconds),
        shopId: shop
      };

      const score = await FirebaseService.saveScore(scoreData);
      
      const duration = Date.now() - startTime;
      await MonitoringService.trackApiCall(shop, 'scores/create', true, duration);
      
      return json({ 
        success: true, 
        score: {
          id: score.id,
          timeInSeconds: score.timeInSeconds,
          difficulty: score.difficulty,
          verified: score.verified
        }
      });
    }

    return json({ 
      success: false, 
      error: "Method not allowed" 
    }, { status: 405 });

  } catch (error) {
    const duration = Date.now() - startTime;
    await MonitoringService.logError(error, {
      endpoint: 'api/puzzle/scores',
      method: request.method,
      duration,
      request: MonitoringService.formatRequestInfo(request)
    });
    
    // Don't expose internal errors to client
    return json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
};

export const loader = async ({ request }) => {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    const difficulty = url.searchParams.get("difficulty");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const global = url.searchParams.get("global") === "true";

    if (!productId || !difficulty) {
      return json({ 
        success: false, 
        error: "Product ID and difficulty are required" 
      }, { status: 400 });
    }

    // Validate limit
    const maxLimit = 100;
    const validLimit = Math.min(Math.max(1, limit), maxLimit);

    const leaderboard = await FirebaseService.getLeaderboard(
      productId, 
      difficulty, 
      validLimit,
      global ? null : shop
    );
    
    return json({ 
      success: true, 
      leaderboard: leaderboard.map(score => ({
        id: score.id,
        nickname: score.nickname,
        timeInSeconds: score.timeInSeconds,
        createdAt: score.createdAt,
        verified: score.verified
      }))
    });

  } catch (error) {
    console.error('API Error in puzzle leaderboard:', error);
    
    return json({ 
      success: false, 
      error: "Failed to fetch leaderboard" 
    }, { status: 500 });
  }
};