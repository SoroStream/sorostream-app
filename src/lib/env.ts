/**
 * Environment variable validation
 * Validates required environment variables at startup and throws clear errors if missing.
 * This should only be called from server-side code (e.g., layout.tsx, middleware, or API routes).
 */

const requiredEnvVars = {
  NEXT_PUBLIC_CONTRACT_ID: 'Deployed StreamContract address',
  NEXT_PUBLIC_STELLAR_NETWORK: 'Network (testnet or mainnet)',
} as const;

type RequiredEnvVar = keyof typeof requiredEnvVars;

let validated = false;

export function validateEnv() {
  if (validated) return;
  // During `next build` page-data collection the runtime env vars aren't
  // available yet — skip and let real deployments validate at startup.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const missing: RequiredEnvVar[] = [];
  
  for (const [key, description] of Object.entries(requiredEnvVars)) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      missing.push(key as RequiredEnvVar);
    }
  }
  
  if (missing.length > 0) {
    const missingList = missing.map(key => `- ${key}: ${requiredEnvVars[key]}`).join('\n');
    throw new Error(
      `Missing required environment variables:\n${missingList}\n\n` +
      `Please set these in your .env.local file. See .env.example for reference.`
    );
  }
  
  validated = true;
}
