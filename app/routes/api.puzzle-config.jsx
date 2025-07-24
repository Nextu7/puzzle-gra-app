import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);
  
  // Secure Firebase configuration - only expose necessary keys
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };

  // Validate required environment variables
  const requiredVars = ['FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing Firebase environment variables:', missingVars);
    return json({ error: 'Configuration error' }, { status: 500 });
  }

  return json({
    firebase: firebaseConfig,
    success: true
  }, {
    headers: {
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Content-Type': 'application/json'
    }
  });
};