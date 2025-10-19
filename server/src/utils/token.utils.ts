import * as jwt from "jsonwebtoken";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

// make sure these are set (fallback to literal defaults before assertions)
const ACCESS_TOKEN_EXPIRY = (process.env.ACCESS_TOKEN_EXPIRY ??
  "15m") as jwt.SignOptions["expiresIn"];
const REFRESH_TOKEN_EXPIRY = (process.env.REFRESH_TOKEN_EXPIRY ??
  "10d") as jwt.SignOptions["expiresIn"];

if (!ACCESS_TOKEN_SECRET) {
  throw new Error("FATAL ERROR: ACCESS_TOKEN_SECRET is not defined in .env");
}
if (!REFRESH_TOKEN_SECRET) {
  throw new Error("FATAL ERROR: REFRESH_TOKEN_SECRET is not defined in .env");
}

// non-null assertion tells TS this cannot be undefined at runtime
const signOptions: jwt.SignOptions = { expiresIn: ACCESS_TOKEN_EXPIRY! };
const refreshSignOptions: jwt.SignOptions = {
  expiresIn: REFRESH_TOKEN_EXPIRY!,
};

export function generateAccessToken(user: { id: string; role: string }) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    ACCESS_TOKEN_SECRET as unknown as jwt.Secret,
    signOptions
  );
}

export function generateRefreshToken(user: { id: string }) {
  return jwt.sign(
    { userId: user.id },
    REFRESH_TOKEN_SECRET as unknown as jwt.Secret,
    refreshSignOptions
  );
}

export function verifyToken(token: string, secret: string) {
  try {
    return jwt.verify(token, secret as unknown as jwt.Secret);
  } catch {
    return null;
  }
}
