import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 1. Generate Token if not present
    // We use a "Double Submit Cookie" pattern.
    // The server doesn't store the token.
    // We just verify that the Cookie value matches the Header value.
    // This provides proof of origin because only the origin can read the non-HttpOnly cookie to set the header.

    const cookieToken = req.cookies['XSRF-TOKEN'];
    let token = cookieToken;

    if (!token) {
      token = crypto.randomBytes(32).toString('hex');
      // Set Client-Readable Cookie
      res.cookie('XSRF-TOKEN', token, {
        httpOnly: false, // Essential: Client must read it
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
    }

    // 2. Verify on Mutation Requests
    const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (mutationMethods.includes(req.method)) {
       const headerToken = req.headers['x-xsrf-token'];
       
       if (!headerToken || headerToken !== token) {
           console.warn('[CSRF] Blocked request from', req.ip);
           throw new UnauthorizedException('Invalid CSRF Token');
       }
    }

    next();
  }
}
