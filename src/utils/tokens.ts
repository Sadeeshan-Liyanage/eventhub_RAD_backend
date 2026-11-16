import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import { Role } from "../models/User";

export interface AccessPayload {
  id: string;
  role: Role;
}

export const signAccessToken = (payload: AccessPayload): string =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as SignOptions);

export const signRefreshToken = (id: string): string =>
  jwt.sign({ id }, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiresIn } as SignOptions);

export const verifyAccessToken = (token: string): AccessPayload =>
  jwt.verify(token, env.jwtSecret) as AccessPayload & jwt.JwtPayload;

export const verifyRefreshToken = (token: string): { id: string } =>
  jwt.verify(token, env.jwtRefreshSecret) as { id: string } & jwt.JwtPayload;



export const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");
