import { Controller, Post, Body, Res, Req, HttpStatus, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';

@Controller('auth/session')
export class AuthSessionController {
  private apiUrl = process.env.VITE_API_URL || 'http://api:3000';

  @Post('login')
  async login(@Body() body: any, @Res() res: Response) {
    try {
      // 1. Call Upstream API
      const result = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!result.ok) {
        return res.status(result.status).json(await result.json());
      }

      const data = await result.json();
      // Expecting { accessToken, refreshToken, user? }
      const tokens = data.tokens || data; 

      if (tokens && tokens.accessToken) {
        // 2. Set HttpOnly Cookie
        this.setCookie(res, 'access_token', tokens.accessToken);
        
        // Return success but NO tokens in body (or keep them if needed for non-browser? No, audit says remove from local storage)
        // We return data.user if available to help frontend state
        return res.status(HttpStatus.OK).json({ 
            success: true, 
            user: data.user || undefined 
        });
      }

      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'No tokens received' });
    } catch (error) {
      console.error('BFF Login Error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  }

  @Post('register')
  async register(@Body() body: any, @Res() res: Response) {
    try {
      const result = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await result.json();

      if (!result.ok) {
        return res.status(result.status).json(data);
      }

      // If register returns tokens (auto-login), set cookie
      const tokens = data.tokens || data;
      if (tokens && tokens.accessToken) {
         this.setCookie(res, 'access_token', tokens.accessToken);
      }

      return res.status(HttpStatus.CREATED).json(data);
    } catch (error) {
       console.error('BFF Register Error:', error);
       return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie('access_token', { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'strict', 
        path: '/' 
    });
    return res.status(HttpStatus.OK).json({ success: true });
  }

  private setCookie(res: Response, name: string, value: string) {
    res.cookie(name, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Should be true in prod. In dev (http), might fail if browser strict? 
                    // Usually secure: true requires https. 
                    // We should check process.env.NODE_ENV === 'production' or similar.
                    // But Audit asked for Secure. 
                    // For local dev on localhost, Secure is supported.
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }
}
