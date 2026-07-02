import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { AuthUser, JwtPayload } from './auth.types';

@Injectable({ providedIn: 'root' })
export class JwtService {
  decode(token: string): AuthUser | null {
    try {
      const payload = jwtDecode<JwtPayload>(token);
      return { userName: payload.user_name, role: payload.role };
    } catch {
      return null;
    }
  }

  isExpired(token: string): boolean {
    try {
      const payload = jwtDecode<JwtPayload>(token);
      const nowInSeconds = Date.now() / 1000;
      return payload.exp <= nowInSeconds;
    } catch {
      return true;
    }
  }
}