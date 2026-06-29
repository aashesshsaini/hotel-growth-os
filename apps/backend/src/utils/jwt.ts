import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserRole } from '@hotel-growth-os/shared';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  hotelId?: string;
  impersonatedBy?: string;
  impersonationSessionId?: string;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
};
