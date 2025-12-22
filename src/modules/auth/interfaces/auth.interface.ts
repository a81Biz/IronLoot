import { UserState } from '@prisma/client';

/**
 * JWT Payload - Data encoded in the access token
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  username: string;
  state: UserState;
  isSeller: boolean;
  iat?: number;
  exp?: number;
}

/**
 * Authenticated User - Attached to request after JWT validation
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  state: UserState;
  isSeller: boolean;
}

/**
 * Token Pair - Access + Refresh tokens
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Login Result - Returned after successful login
 */
export interface LoginResult {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    state: UserState;
    isSeller: boolean;
  };
  tokens: TokenPair;
}

/**
 * Registration Result
 */
export interface RegisterResult {
  user: {
    id: string;
    email: string;
    username: string;
  };
  message: string;
}
