import { Request, Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet } from 'jose-cjs';
import { env } from '../config/env';

// Extend Express Request to include user payload
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const JWKS = createRemoteJWKSet(new URL(`${env.CLIENT_URL}/api/auth/jwks`));

export const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: "Unauthorized: Missing or malformed header" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "Unauthorized: No token provided" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error);
    return res.status(401).json({ msg: "Unauthorized: Invalid token" });
  }
};
