import { Component } from '@angular/core';

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'E-Ticaret Mağazam';
  cart: Product[] = [];
  
  products: Product[] = [
    { id: 1, name: 'Laptop', price: 15000, image: '💻', description: 'Güçlü iş laptopu' },
    { id: 2, name: 'Telefon', price: 8000, image: '📱', description: 'Akıllı telefon' },
    { id: 3, name: 'Kulaklık', price: 500, image: '🎧', description: 'Kablosuz kulaklık' },
    { id: 4, name: 'Tablet', price: 6000, image: '📱', description: 'Yüksek çözünürlük' },
    { id: 5, name: 'Saat', price: 3000, image: '⌚', description: 'Akıllı saat' },
    { id: 6, name: 'Kamera', price: 12000, image: '📷', description: 'Profesyonel kamera' }
  ];

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
}
