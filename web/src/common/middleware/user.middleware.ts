import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class UserMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies['access_token'];

    if (token) {
      try {
        // Decode only, verification happens request-side usually with secret
        // For UI state, decoding is often sufficient if we trust the cookie (httpOnly)
        // Ideally we verify with secret if shared, but for now we decode to get user info for UI.
        const decoded = jwt.decode(token);
        
        if (decoded) {
            req['user'] = decoded;
            res.locals.user = decoded; // Make available to Nunjucks
        }
      } catch (err) {
        // Token invalid, ignore
      }
    }

    next();
  }
}
