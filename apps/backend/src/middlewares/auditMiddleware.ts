import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express.d';
import { AuditLog } from '../models';

export const auditLogMiddleware =
  (action: string, entity: string) =>
  async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await AuditLog.create({
        hotelId: req.hotelId,
        userId: req.user?.userId,
        action,
        entity,
        entityId: req.params.id,
        changes: req.method !== 'GET' ? req.body : undefined,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch {
      // Audit logging should not block requests
    }
    next();
  };
