import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { RequestUser } from './types';

@Injectable()
export class JwtUserMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const header = req.header('authorization');
    if (!header || !header.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = header.slice('Bearer '.length);

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
      });

      const user: RequestUser = {
        id: payload.sub,
        role: payload.role,
        organizationId: payload.organizationId,
        serviceUserId: payload.serviceUserId,
      };

      (req as Request & { user?: RequestUser }).user = user;
    } catch {
      // invalid token is treated as anonymous; guard decides access
    }

    next();
  }
}
