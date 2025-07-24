import { FirebaseService } from './firebase.server.js';
import { authenticate } from '../shopify.server.js';

export class PuzzleService {
  static async getOrCreatePlayer(shop, customerId, nickname) {
    if (!customerId) {
      throw new Error("Customer ID is required");
    }

    try {
      // Try to get existing player
      const existingPlayer = await FirebaseService.getPlayerProfile(customerId);
      
      if (existingPlayer) {
        return existingPlayer;
      }

      // Create new player if nickname provided
      if (nickname) {
        return await FirebaseService.createPlayerProfile(customerId, nickname);
      }

      return null;
    } catch (error) {
      console.error('Error in getOrCreatePlayer:', error);
      throw error;
    }
  }

  static async updatePlayerNickname(playerId, nickname) {
    try {
      return await FirebaseService.updatePlayerProfile(playerId, { nickname });
    } catch (error) {
      console.error('Error updating player nickname:', error);
      throw error;
    }
  }

  static async saveScore(playerId, productId, difficulty, timeInSeconds, shop) {
    try {
      const scoreData = {
        customerId: playerId,
        productId: productId.toString(),
        difficulty,
        timeInSeconds,
        shopId: shop
      };

      return await FirebaseService.saveScore(scoreData);
    } catch (error) {
      console.error('Error saving score:', error);
      throw error;
    }
  }

  static async getLeaderboard(productId, difficulty, shop, limitCount = 10, global = false) {
    try {
      // Get shop-specific or global leaderboard
      const shopId = global ? null : shop;
      return await FirebaseService.getLeaderboard(productId, difficulty, limitCount, shopId);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  static async getPlayerStats(playerId) {
    try {
      return await FirebaseService.getPlayerStats(playerId);
    } catch (error) {
      console.error('Error getting player stats:', error);
      throw error;
    }
  }

  // Simplified session tracking (optional - can be removed if not needed)
  static async createGameSession(playerId, productId, difficulty, shop) {
    // Just return a simple session object for compatibility
    return {
      id: Date.now().toString(),
      startedAt: new Date()
    };
  }

  static async completeGameSession(sessionId, timeSpent) {
    // Simple completion tracking
    return {
      id: sessionId,
      completedAt: new Date(),
      timeSpent
    };
  }
}