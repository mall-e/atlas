import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgxTurnstileModule } from 'ngx-turnstile';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgxTurnstileModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username: string = '';  // email yerine username kullan
  password: string = '';
  turnstileToken: string = '';
  errorMessage: string = '';
  isLoading: boolean = false;

  // Cloudflare Turnstile site key - Bu değeri Cloudflare dashboard'unuzdan alın
  siteKey: string = '1x00000000000000000000AA'; // TEST KEY - Gerçek key ile değiştirin!

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onTurnstileResolved(token: string | null): void {
    this.turnstileToken = token || '';
    this.errorMessage = '';
  }

  onTurnstileError(): void {
    this.errorMessage = 'Bot kontrolü başarısız oldu. Lütfen sayfayı yenileyin.';
    this.turnstileToken = '';
  }

  onSubmit(): void {
    // Validasyon
    if (!this.username || !this.password) {
      this.errorMessage = 'Lütfen tüm alanları doldurun.';
      return;
    }

    if (!this.turnstileToken) {
      this.errorMessage = 'Lütfen bot kontrolünü tamamlayın.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Auth service sadece username ve password bekliyor
    this.authService.login({
      username: this.username,
      password: this.password
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.token) {
          // Token'ı localStorage'a kaydet
          localStorage.setItem('auth_token', response.token);
          // Başarılı giriş - ana sayfaya yönlendir
          this.router.navigate(['/']);
        } else if (response.error) {
          this.errorMessage = response.error;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.error || 'Kullanıcı adı veya şifre yanlış.';
        console.error('Login error:', error);
      }
    });
  }
}
