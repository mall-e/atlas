const express = require('express');
const jwt = require('jsonwebtoken');
const nano = require('nano')('http://admin:password123@couchdb:5984');
const app = express();

const PORT = 3000;
const JWT_SECRET = 'my-secret-key';

// CouchDB database
let usersDB;

// Database'i başlat
async function initDB() {
  try {
    // users veritabanı var mı kontrol et
    const dbList = await nano.db.list();
    if (!dbList.includes('users')) {
      await nano.db.create('users');
      console.log('users database created');
    }
    usersDB = nano.db.use('users');
    console.log('Connected to CouchDB');
  } catch (error) {
    console.error('CouchDB connection error:', error);
    process.exit(1);
  }
}

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Register - Kullanıcı kayıt
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username ve password gerekli' });
  }

  try {
    // Kullanıcı var mı kontrol et
    try {
      await usersDB.get(username);
      return res.status(400).json({ error: 'Kullanıcı zaten var' });
    } catch (err) {
      // Kullanıcı yok, devam et
    }

    // Yeni kullanıcı kaydet
    await usersDB.insert({
      _id: username,
      username,
      password,
      createdAt: new Date().toISOString()
    });

    res.json({ message: 'Kayıt başarılı', username });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Kayıt sırasında hata oluştu' });
  }
});

// Login - Giriş yap
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username ve password gerekli' });
  }

  try {
    // Kullanıcıyı CouchDB'den getir
    const user = await usersDB.get(username);
    
    if (user.password !== password) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre yanlış' });
    }

    // JWT token oluştur
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    
    res.json({ token, message: 'Giriş başarılı' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Kullanıcı adı veya şifre yanlış' });
  }
});

// Verify - Token doğrula
app.post('/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token bulunamadı' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, username: decoded.username });
  } catch (error) {
    res.status(401).json({ error: 'Geçersiz token' });
  }
});

// Server'ı başlat
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Auth service çalışıyor: http://localhost:${PORT}`);
    console.log('CouchDB connection: http://couchdb:5984');
  });
});