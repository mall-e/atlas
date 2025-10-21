# Login ve Register Sayfaları - Cloudflare Turnstile ile Bot Kontrolü

## Oluşturulan Dosyalar

### 1. Authentication Service
- **Dosya:** `src/app/services/auth.service.ts`
- **Açıklama:** Login, register, logout işlemlerini yöneten servis
- **Özellikler:**
  - JWT token yönetimi
  - LocalStorage ile kullanıcı bilgisi saklama
  - Reactive state management (BehaviorSubject)
  - HTTP istekleri için hazır methodlar

### 2. Login Component
- **Dosyalar:**
  - `src/app/components/login/login.component.ts`
  - `src/app/components/login/login.component.html`
  - `src/app/components/login/login.component.css`
- **Özellikler:**
  - E-posta ve şifre ile giriş
  - Cloudflare Turnstile bot kontrolü
  - Form validasyonu
  - Hata mesajları
  - Responsive tasarım

### 3. Register Component
- **Dosyalar:**
  - `src/app/components/register/register.component.ts`
  - `src/app/components/register/register.component.html`
  - `src/app/components/register/register.component.css`
- **Özellikler:**
  - Kullanıcı adı, e-posta ve şifre ile kayıt
  - Şifre tekrarı kontrolü
  - E-posta format validasyonu
  - Cloudflare Turnstile bot kontrolü
  - Responsive tasarım

### 4. Routing
- **Dosya:** `src/app/app.routes.ts`
- **Rotalar:**
  - `/login` - Giriş sayfası
  - `/register` - Kayıt sayfası

### 5. Navigation
- Ana sayfada header'a eklenen özellikler:
  - Giriş yapmamış kullanıcılar için "Giriş Yap" ve "Kayıt Ol" linkleri
  - Giriş yapmış kullanıcılar için kullanıcı adı ve "Çıkış" butonu

## Cloudflare Turnstile Kurulumu

### 1. Cloudflare Dashboard'dan Site Key Alma

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) adresine gidin
2. Sol menüden **Turnstile** seçeneğini seçin
3. **Add Site** butonuna tıklayın
4. Site bilgilerinizi girin:
   - **Site Name:** Projenizin adı
   - **Domain:** localhost (development için) veya gerçek domain'iniz
   - **Widget Mode:** Managed (önerilen)
5. **Create** butonuna tıklayın
6. **Site Key** ve **Secret Key**'i kopyalayın

### 2. Frontend'e Site Key Ekleme

Login ve Register component'lerinde `siteKey` değişkenini güncelleyin:

```typescript
// src/app/components/login/login.component.ts
siteKey: string = 'BURAYA_SITE_KEY_EKLEYIN';

// src/app/components/register/register.component.ts
siteKey: string = 'BURAYA_SITE_KEY_EKLEYIN';
```

### 3. Backend API URL'i Güncelleme

Auth service'de backend API URL'inizi güncelleyin:

```typescript
// src/app/services/auth.service.ts
private apiUrl = 'http://localhost:8080/api/auth'; // Backend URL'inizi buraya ekleyin
```

## Backend API Gereksinimleri

Backend API'nizin aşağıdaki endpoint'leri desteklemesi gerekiyor:

### POST /api/auth/login
```json
Request:
{
  "email": "user@example.com",
  "password": "password123",
  "turnstileToken": "cloudflare_turnstile_token"
}

Response (Success):
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "username"
  }
}

Response (Error):
{
  "success": false,
  "message": "Geçersiz email veya şifre"
}
```

### POST /api/auth/register
```json
Request:
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "turnstileToken": "cloudflare_turnstile_token"
}

Response (Success):
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "newuser"
  }
}

Response (Error):
{
  "success": false,
  "message": "Bu email zaten kayıtlı"
}
```

### Backend'de Turnstile Token Doğrulama

Backend'de Cloudflare Turnstile token'ı doğrulamanız gerekiyor:

```javascript
// Node.js örneği
async function verifyTurnstileToken(token, remoteip) {
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      secret: 'YOUR_SECRET_KEY', // Cloudflare'den aldığınız Secret Key
      response: token,
      remoteip: remoteip
    }),
  });

  const data = await response.json();
  return data.success;
}
```

## Test Etme

### 1. Development Server'ı Başlatma
```bash
npm start
```

### 2. Sayfaları Test Etme
- Ana sayfa: http://localhost:4200/
- Login: http://localhost:4200/login
- Register: http://localhost:4200/register

### 3. Test İçin Geçici Key
Login ve Register component'lerinde şu test key'i kullanabilirsiniz (sadece development için):
```
1x00000000000000000000AA
```

**ÖNEMLİ:** Production'da mutlaka gerçek Cloudflare Turnstile key'inizi kullanın!

## Güvenlik Notları

1. **CORS:** Backend'de CORS ayarlarını yapılandırın
2. **HTTPS:** Production'da HTTPS kullanın
3. **Token Güvenliği:** JWT token'ları güvenli bir şekilde saklayın
4. **Rate Limiting:** Backend'de rate limiting uygulayın
5. **Turnstile Doğrulama:** Backend'de mutlaka Turnstile token'ı doğrulayın

## Özelleştirme

### Renkleri Değiştirme
- Login sayfası renkleri: `src/app/components/login/login.component.css`
- Register sayfası renkleri: `src/app/components/register/register.component.css`

### Validasyon Kurallarını Değiştirme
- Login validasyon: `src/app/components/login/login.component.ts` - `onSubmit()` method
- Register validasyon: `src/app/components/register/register.component.ts` - `onSubmit()` method

### Hata Mesajlarını Özelleştirme
Component'lerdeki `errorMessage` değişkenlerini ve template'lerdeki mesajları güncelleyin.

## Sorun Giderme

### Turnstile Widget Görünmüyor
- Site Key'i doğru olduğundan emin olun
- Network sekmesinde Cloudflare isteklerini kontrol edin
- Browser console'da hata mesajlarını kontrol edin

### Login/Register İşlemi Başarısız
- Backend API URL'inin doğru olduğundan emin olun
- CORS ayarlarını kontrol edin
- Network sekmesinde API isteklerini kontrol edin

### Token Kaybolması
- LocalStorage'ın aktif olduğundan emin olun
- Private/Incognito modda LocalStorage çalışmayabilir
