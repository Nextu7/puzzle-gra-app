import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { PuzzleService } from "../services/puzzle.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  if (!productId) {
    return json({ error: "Product ID is required" }, { status: 400 });
  }

  try {
    const config = await PuzzleService.getPuzzleConfig(productId, shop);
    
    return json({ 
      success: true, 
      config: config || {
        isEnabled: true,
        difficulties: "p30,p56,p99,p143,p304"
      }
    });
  } catch (error) {
    console.error("Error fetching puzzle config:", error);
    return json({ error: "Failed to fetch puzzle config" }, { status: 500 });
  }
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  
  if (request.method === "POST" || request.method === "PUT") {
    try {
      const { productId, isEnabled, imageUrl, previewUrl, difficulties } = await request.json();
      
      if (!productId) {
        return json({ error: "Product ID is required" }, { status: 400 });
      }

      const config = await PuzzleService.upsertPuzzleConfig(productId, shop, {
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        imageUrl,
        previewUrl,
        difficulties: difficulties || "p30,p56,p99,p143,p304"
      });
      
      return json({ 
        success: true, 
        config
      });
    } catch (error) {
      console.error("Error saving puzzle config:", error);
      return json({ error: "Failed to save puzzle config" }, { status: 500 });
    }
  }

  return json({ error: "Method not allowed" }, { status: 405 });
};