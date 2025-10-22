import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  message?: string;
  username?: string;
  error?: string;
}

export interface RegisterResponse {
  message?: string;
  username?: string;
  error?: string;
}

export interface VerifyResponse {
  valid?: boolean;
  username?: string;
  error?: string;
}

export interface CurrentUser {
  username: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Auth service URL'i - Kubernetes service adını kullan
  private apiUrl = '/api/';
  private currentUser: CurrentUser | null = null;

  constructor(private http: HttpClient) {}

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}register`, data);
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}login`, data);
  }

  verify(): Observable<VerifyResponse> {
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post<VerifyResponse>(`${this.apiUrl}verify`, {}, { headers });
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    this.currentUser = null;
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getCurrentUser(): CurrentUser | null {
    // Token'dan username'i decode et
    const token = this.getToken();
    if (!token) return null;

    // Cache'den dön
    if (this.currentUser) return this.currentUser;

    try {
      // JWT'nin payload kısmını decode et (base64)
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.currentUser = { username: payload.username };
      return this.currentUser;
    } catch (e) {
      console.error('Token decode error:', e);
      return null;
    }
  }
}
