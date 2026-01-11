import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class UserMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies['access_token'];

    if (token) {
      try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
           console.error('JWT_SECRET not defined in environment');
           throw new Error('JWT configuration error');
        }

        // Verify token signature
        const decoded = jwt.verify(token, secret);
        
        if (decoded) {
             // Check expiration (verify handles it, but keeping logic just in case if options differ)
             // jwt.verify throws if expired unless ignoreExpiration: true
             req['user'] = decoded;
             res.locals.user = decoded; // Make available to Nunjucks
             res.locals.userJson = JSON.stringify(decoded);
        }
      } catch (err) {
        // Token invalid or expired
        res.locals.user = null;
        req['user'] = null;
      }
    }

    next();
  }
}
