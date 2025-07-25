import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { FirebaseService } from "../services/firebase.server";

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  
  if (request.method === "POST") {
    try {
      const { playerId, productId, difficulty } = await request.json();
      
      if (!productId || !difficulty) {
        return json({ error: "Product ID and difficulty are required" }, { status: 400 });
      }

      const sessionData = {
        customerId: playerId,
        productId,
        difficulty,
        shopId: shop
      };

      const gameSession = await FirebaseService.createGameSession(sessionData);
      
      return json({ 
        success: true, 
        session: {
          id: gameSession.id,
          startedAt: gameSession.startedAt
        }
      });
    } catch (error) {
      console.error("Error creating game session:", error);
      return json({ error: "Failed to create game session" }, { status: 500 });
    }
  }

  if (request.method === "PUT") {
    try {
      const { sessionId, timeSpent } = await request.json();
      
      if (!sessionId || !timeSpent) {
        return json({ error: "Session ID and time spent are required" }, { status: 400 });
      }

      const gameSession = await FirebaseService.updateGameSession(sessionId, {
        timeSpent,
        completedAt: new Date(),
        status: 'completed'
      });
      
      return json({ 
        success: true, 
        session: {
          id: gameSession.id,
          completedAt: gameSession.completedAt,
          timeSpent: gameSession.timeSpent
        }
      });
    } catch (error) {
      console.error("Error completing game session:", error);
      return json({ error: "Failed to complete game session" }, { status: 500 });
    }
  }

  return json({ error: "Method not allowed" }, { status: 405 });
};