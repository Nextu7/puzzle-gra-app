import { json } from "@remix-run/node";
import { PuzzleService } from "../services/puzzle.server";
import { AuthService } from "../services/auth.server";

export const action = async ({ request }) => {
  const auth = await AuthService.requireAuth(request);
  const shop = auth.shop;
  
  if (request.method === "POST") {
    try {
      const data = await request.json();
      const validation = AuthService.validateInputSafety(data);
      
      if (!validation.isValid) {
        return json({ error: validation.error }, { status: 400 });
      }

      const { customerId, nickname } = data;
      
      if (!customerId) {
        return json({ error: "Customer ID is required" }, { status: 400 });
      }

      // Rate limiting
      const rateLimit = AuthService.validateRateLimit(shop, 'create_player', 10, 60000);
      if (!rateLimit.allowed) {
        return json({ error: "Rate limit exceeded" }, { status: 429 });
      }

      const player = await PuzzleService.getOrCreatePlayer(shop, customerId, nickname);
      
      return json({ 
        success: true, 
        player: {
          id: player.id,
          nickname: player.nickname,
          customerId: player.customerId
        }
      });
    } catch (error) {
      console.error("Error creating/getting player:", error);
      return json({ error: "Failed to create player" }, { status: 500 });
    }
  }

  if (request.method === "PUT") {
    try {
      const data = await request.json();
      const validation = AuthService.validateInputSafety(data);
      
      if (!validation.isValid) {
        return json({ error: validation.error }, { status: 400 });
      }

      const { playerId, nickname } = data;
      
      if (!playerId || !nickname) {
        return json({ error: "Player ID and nickname are required" }, { status: 400 });
      }

      // Rate limiting
      const rateLimit = AuthService.validateRateLimit(shop, 'update_player', 5, 60000);
      if (!rateLimit.allowed) {
        return json({ error: "Rate limit exceeded" }, { status: 429 });
      }

      const player = await PuzzleService.updatePlayerNickname(playerId, nickname);
      
      return json({ 
        success: true, 
        player: {
          id: player.id,
          nickname: player.nickname
        }
      });
    } catch (error) {
      console.error("Error updating player:", error);
      return json({ error: "Failed to update player" }, { status: 500 });
    }
  }

  return json({ error: "Method not allowed" }, { status: 405 });
};