import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { PuzzleService } from "../services/puzzle.server";

export const action = async ({ request }) => {
  try {
    // Authenticate with Shopify
    const { session } = await authenticate.admin(request);
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

      // Rate limiting - max 10 scores per minute per shop
      const rateLimitKey = `score_${shop}_${Math.floor(Date.now() / 60000)}`;
      if (!global.scoreRateLimit) global.scoreRateLimit = new Map();
      
      const currentCount = global.scoreRateLimit.get(rateLimitKey) || 0;
      if (currentCount >= 10) {
        return json({ 
          success: false, 
          error: "Rate limit exceeded. Too many score submissions." 
        }, { status: 429 });
      }
      global.scoreRateLimit.set(rateLimitKey, currentCount + 1);

      // Save score through secure service
      const score = await PuzzleService.saveScore(
        playerId, 
        productId, 
        difficulty, 
        Math.floor(timeInSeconds), // Ensure integer
        shop
      );
      
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
    console.error('API Error in puzzle scores:', error);
    
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

    const leaderboard = await PuzzleService.getLeaderboard(
      productId, 
      difficulty, 
      shop, 
      validLimit,
      global
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