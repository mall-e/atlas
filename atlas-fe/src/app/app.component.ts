import { Component } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from './services/auth.service';

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
}

interface PushNotificationRequest {
  deviceToken: string;
  title: string;
  body: string;
  badge?: number;
  sound?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'E-Ticaret Mağazam';
  cart: Product[] = [];

  // Push notification için
  notificationTitle: string = '';
  notificationBody: string = '';
  deviceToken: string = '';
  isSendingNotification: boolean = false;
  notificationMessage: string = '';

  products: Product[] = [
    { id: 1, name: 'Laptop', price: 15000, image: '💻', description: 'Güçlü iş laptopu' },
    { id: 2, name: 'Telefon', price: 8000, image: '📱', description: 'Akıllı telefon' },
    { id: 3, name: 'Kulaklık', price: 500, image: '🎧', description: 'Kablosuz kulaklık' },
    { id: 4, name: 'Tablet', price: 6000, image: '📱', description: 'Yüksek çözünürlük' },
    { id: 5, name: 'Saat', price: 3000, image: '⌚', description: 'Akıllı saat' },
    { id: 6, name: 'Kamera', price: 12000, image: '📷', description: 'Profesyonel kamera' }
  ];

  constructor(
    private http: HttpClient,
    public authService: AuthService
  ) {}

  addToCart(product: Product) {
    this.cart.push(product);
    alert(`${product.name} sepete eklendi!`);
  }

  getTotalPrice(): number {
    return this.cart.reduce((sum, item) => sum + item.price, 0);
  }

  removeFromCart(index: number) {
    this.cart.splice(index, 1);
  }

  sendPushNotification() {
    // Validasyon
    if (!this.notificationTitle || !this.notificationBody) {
      this.notificationMessage = '❌ Lütfen başlık ve içerik alanlarını doldurun!';
      setTimeout(() => this.notificationMessage = '', 3000);
      return;
    }

    if (!this.deviceToken) {
      this.notificationMessage = '❌ Lütfen device token giriniz!';
      setTimeout(() => this.notificationMessage = '', 3000);
      return;
    }

    this.isSendingNotification = true;
    this.notificationMessage = '';

    const payload: PushNotificationRequest = {
      deviceToken: this.deviceToken,
      title: this.notificationTitle,
      body: this.notificationBody,
      badge: 1,
      sound: 'default'
    };

    // Kubernetes cluster içi servis adı kullanın
    const apiUrl = 'http://push-notification-service.default.svc.cluster.local:8083/send-notification';

    this.http.post(apiUrl, payload).subscribe({
      next: (response: any) => {
        this.isSendingNotification = false;
        if (response.success) {
          this.notificationMessage = '✅ Bildirim başarıyla gönderildi!';
          this.notificationTitle = '';
          this.notificationBody = '';
          setTimeout(() => this.notificationMessage = '', 5000);
        } else {
          this.notificationMessage = `❌ Bildirim gönderilemedi: ${JSON.stringify(response.error)}`;
          setTimeout(() => this.notificationMessage = '', 5000);
        }
      },
      error: (error) => {
        this.isSendingNotification = false;
        this.notificationMessage = `❌ Hata: ${error.message || 'Bağlantı hatası'}`;
        console.error('Push notification error:', error);
        setTimeout(() => this.notificationMessage = '', 5000);
      }
    });
  }
}
