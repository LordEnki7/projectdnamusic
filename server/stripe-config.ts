/**
 * Stripe configuration for test/live mode
 * Uses Replit secrets for secure key management
 */

export const stripeConfig = {
  // Set to true to use TEST mode (recommended for development)
  useTestMode: false,
  
  // Test keys - both from environment variables (Replit secrets)
  testKeys: {
    publicKey: process.env.VITE_STRIPE_TEST_PUBLIC_KEY || '',
    secretKey: process.env.STRIPE_TEST_SECRET_KEY || '',
  },
  
  // Live keys - both from environment variables (Replit secrets)
  liveKeys: {
    publicKey: process.env.VITE_STRIPE_PUBLIC_KEY || '',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
  },
  
  // Get the appropriate keys based on mode
  getKeys() {
    return this.useTestMode ? this.testKeys : this.liveKeys;
  },
  
  // Get secret key for server
  getSecretKey() {
    return this.getKeys().secretKey;
  },
  
  // Get public key for client
  getPublicKey() {
    return this.getKeys().publicKey;
  },
  
  // Get current mode
  getMode() {
    return this.useTestMode ? 'TEST' : 'LIVE';
  }
};
