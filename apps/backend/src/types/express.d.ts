import { Request } from 'express';
import { JwtPayload } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: JwtPayload;
  hotelId?: string;
}

export interface HotelScopedRequest extends AuthRequest {
  hotelId: string;
}
