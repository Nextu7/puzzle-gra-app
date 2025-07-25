import { authenticate } from "../shopify.server";
import prisma from "../db.server";

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

    // Validate customer ID format
    if (!customerId || typeof customerId !== 'string') {
      return {
        isValid: false,
        error: "Valid customer ID is required"
      };
    }

    // Validate customer ID format (should be numeric string)
    if (!/^\d+$/.test(customerId)) {
      return {
        isValid: false,
        error: "Invalid customer ID format"
      };
    }

    try {
      // Verify customer exists in Shopify
      const customerQuery = `
        query getCustomer($id: ID!) {
          customer(id: $id) {
            id
            email
            firstName
            lastName
            state
          }
        }
      `;

      const response = await auth.session.graphql(customerQuery, {
        variables: { id: `gid://shopify/Customer/${customerId}` }
      });

      const customerData = await response.json();
      
      if (!customerData.data?.customer) {
        return {
          isValid: false,
          error: "Customer not found"
        };
      }

      // Check if customer account is enabled
      if (customerData.data.customer.state === 'DISABLED') {
        return {
          isValid: false,
          error: "Customer account is disabled"
        };
      }

      return {
        isValid: true,
        shop: auth.shop,
        customerId: customerId.toString(),
        session: auth.session,
        customerData: customerData.data.customer
      };
    } catch (error) {
      console.error('Customer validation error:', error);
      return {
        isValid: false,
        error: "Failed to validate customer"
      };
    }
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

  static async validateRateLimit(shop, action, maxRequests = 100, windowMs = 60000) {
    const key = `${shop}:${action}`;
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    try {
      // Clean up old rate limit entries
      await prisma.rateLimit.deleteMany({
        where: {
          window: {
            lt: windowStart
          }
        }
      });

      // Get current rate limit record
      const existing = await prisma.rateLimit.findUnique({
        where: { key }
      });

      if (existing) {
        // Check if within rate limit
        if (existing.requests >= maxRequests && existing.window > windowStart) {
          return {
            allowed: false,
            resetTime: new Date(existing.window.getTime() + windowMs),
            remaining: 0
          };
        }

        // Update existing record
        const updated = await prisma.rateLimit.update({
          where: { key },
          data: {
            requests: existing.window > windowStart ? existing.requests + 1 : 1,
            window: existing.window > windowStart ? existing.window : now,
            shop: shop
          }
        });

        return {
          allowed: true,
          remaining: Math.max(0, maxRequests - updated.requests),
          resetTime: new Date(updated.window.getTime() + windowMs)
        };
      } else {
        // Create new rate limit record
        await prisma.rateLimit.create({
          data: {
            key,
            requests: 1,
            window: now,
            shop: shop
          }
        });

        return {
          allowed: true,
          remaining: maxRequests - 1,
          resetTime: new Date(now.getTime() + windowMs)
        };
      }
    } catch (error) {
      console.error('Rate limit validation error:', error);
      // Fall back to allowing the request if database fails
      return {
        allowed: true,
        remaining: maxRequests,
        error: 'Rate limit check failed'
      };
    }
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