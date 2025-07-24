import { authenticate } from "../shopify.server";

export class AuthService {
  static async validateShopifySession(request) {
    try {
      const { session } = await authenticate.admin(request);
      return {
        isValid: true,
        shop: session.shop,
        session
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  static async validateCustomerAccess(request, customerId) {
    const auth = await this.validateShopifySession(request);
    if (!auth.isValid) {
      return auth;
    }

    // For now, we trust the customer ID from the frontend
    // In production, you might want to validate this against Shopify's customer API
    if (!customerId) {
      return {
        isValid: false,
        error: "Customer ID is required"
      };
    }

    return {
      isValid: true,
      shop: auth.shop,
      customerId: customerId.toString(),
      session: auth.session
    };
  }

  static async requireAuth(request) {
    const auth = await this.validateShopifySession(request);
    if (!auth.isValid) {
      throw new Response("Unauthorized", { status: 401 });
    }
    return auth;
  }

  static async requireCustomerAuth(request, customerId) {
    const auth = await this.validateCustomerAccess(request, customerId);
    if (!auth.isValid) {
      throw new Response(auth.error || "Unauthorized", { status: 401 });
    }
    return auth;
  }

  static validateRateLimit(shop, action, maxRequests = 100, windowMs = 60000) {
    // Simple in-memory rate limiting
    // In production, use Redis or similar
    if (!global.rateLimitStore) {
      global.rateLimitStore = new Map();
    }

    const key = `${shop}:${action}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    const requests = global.rateLimitStore.get(key) || [];
    const validRequests = requests.filter(time => time > windowStart);

    if (validRequests.length >= maxRequests) {
      return {
        allowed: false,
        resetTime: Math.min(...validRequests) + windowMs
      };
    }

    validRequests.push(now);
    global.rateLimitStore.set(key, validRequests);

    return {
      allowed: true,
      remaining: maxRequests - validRequests.length
    };
  }

  static validateInputSafety(input) {
    if (typeof input !== 'object' || input === null) {
      return { isValid: false, error: "Invalid input format" };
    }

    // Validate nickname if present
    if (input.nickname) {
      if (typeof input.nickname !== 'string') {
        return { isValid: false, error: "Nickname must be a string" };
      }
      if (input.nickname.length > 25 || input.nickname.length < 1) {
        return { isValid: false, error: "Nickname must be 1-25 characters" };
      }
      if (!/^[a-zA-Z0-9\s\-_]+$/.test(input.nickname)) {
        return { isValid: false, error: "Nickname contains invalid characters" };
      }
    }

    // Validate time if present
    if (input.timeInSeconds !== undefined) {
      if (typeof input.timeInSeconds !== 'number' || input.timeInSeconds < 0 || input.timeInSeconds > 86400) {
        return { isValid: false, error: "Invalid time value" };
      }
    }

    // Validate difficulty if present
    if (input.difficulty) {
      const validDifficulties = ['p30', 'p56', 'p99', 'p143', 'p304'];
      if (!validDifficulties.includes(input.difficulty)) {
        return { isValid: false, error: "Invalid difficulty level" };
      }
    }

    return { isValid: true };
  }
}