import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    // Authenticate the proxy request
    const { session } = await authenticate.public.appProxy(request);
    
    // Validate required environment variables
    const requiredVars = ['FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing Firebase environment variables:', missingVars);
      return json({ 
        error: 'Service temporarily unavailable',
        code: 'CONFIG_ERROR' 
      }, { status: 503 });
    }

    // Return minimal Firebase configuration for client
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID
    };

    return json({
      firebase: firebaseConfig,
      success: true,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, max-age=1800', // Cache for 30 minutes
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Puzzle config API error:', error);
    
    return json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR' 
    }, { 
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};