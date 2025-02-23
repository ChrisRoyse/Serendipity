import { create, verify, getNumericDate } from "djwt";

// Generate a secure key for JWT signing
const JWT_SECRET_KEY = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-256" },
  true,
  ["sign", "verify"]
);
const JWT_EXP_DAYS = 30;

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export async function generateToken(userId: string): Promise<string> {
  const jwt = await create(
    { alg: "HS256", typ: "JWT" },
    { 
      sub: userId,
      exp: getNumericDate(JWT_EXP_DAYS * 24 * 60 * 60) // 30 days
    },
    JWT_SECRET_KEY
  );
  return jwt;
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const payload = await verify(token, JWT_SECRET_KEY);
    return payload.sub as string;
  } catch {
    return null;
  }
}

export async function authMiddleware(req: Request): Promise<{ userId: string | null; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { userId: null, error: "No authorization header" };
  }

  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token) {
    return { userId: null, error: "Invalid authorization header" };
  }

  const userId = await verifyToken(token);
  if (!userId) {
    return { userId: null, error: "Invalid token" };
  }

  return { userId };
}

export function generateApiKey(): string {
  return `sk_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function hashPassword(password: string): Promise<string> {
  // In a real app, use bcrypt or similar. For demo, using a simple hash
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  console.log('Password hashing:', { password, hash });
  return hash;
}
