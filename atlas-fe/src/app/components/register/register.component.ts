import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgxTurnstileModule } from 'ngx-turnstile';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgxTurnstileModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  username: string = '';
  password: string = '';
  confirmPassword: string = '';
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
    if (!this.username || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Lütfen tüm alanları doldurun.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Şifreler eşleşmiyor.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Şifre en az 6 karakter olmalıdır.';
      return;
    }

    if (!this.turnstileToken) {
      this.errorMessage = 'Lütfen bot kontrolünü tamamlayın.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Auth service sadece username ve password bekliyor
    this.authService.register({
      username: this.username,
      password: this.password
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.message) {
          // Başarılı kayıt - login sayfasına yönlendir
          alert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
          this.router.navigate(['/login']);
        } else if (response.error) {
          this.errorMessage = response.error;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.error || 'Kayıt başarısız oldu.';
        console.error('Register error:', error);
      }
    });
  }
}
