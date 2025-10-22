const express = require('express');
const jwt = require('jsonwebtoken');
const nano = require('nano')('http://admin:password123@couchdb:5984');
const promClient = require('prom-client');
const app = express();

const PORT = 3000;
const JWT_SECRET = 'my-secret-key';

let usersDB;

// Prometheus metrics registry
const register = new promClient.Registry();

// Default metrics (CPU, Memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Toplam HTTP istek sayısı',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

const loginAttemptsTotal = new promClient.Counter({
  name: 'login_attempts_total',
  help: 'Toplam login denemesi',
  labelNames: ['status'],
  registers: [register]
});

const registerAttemptsTotal = new promClient.Counter({
  name: 'register_attempts_total',
  help: 'Toplam register denemesi',
  labelNames: ['status'],
  registers: [register]
});

const activeUsersGauge = new promClient.Gauge({
  name: 'active_users_total',
  help: 'Toplam kayıtlı kullanıcı sayısı',
  registers: [register]
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP istek süreleri',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

// Database başlat
async function initDB() {
  try {
    const dbList = await nano.db.list();
    if (!dbList.includes('users')) {
      await nano.db.create('users');
      console.log('users database created');
    }
    usersDB = nano.db.use('users');
    console.log('Connected to CouchDB');
    
    // Kullanıcı sayısını güncelle
    await updateUserCount();
  } catch (error) {
    console.error('CouchDB connection error:', error);
    process.exit(1);
  }
}

// Kullanıcı sayısını güncelle
async function updateUserCount() {
  try {
    const result = await usersDB.list();
    activeUsersGauge.set(result.rows.length);
  } catch (error) {
    console.error('Error updating user count:', error);
  }
}

// Request tracking middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.labels(req.method, req.path, res.statusCode).inc();
    httpRequestDuration.labels(req.method, req.path, res.statusCode).observe(duration);
  });
  
  next();
});

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

// Metrics endpoint - Prometheus buradan veri çeker
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Register - Kullanıcı kayıt
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    registerAttemptsTotal.labels('failed').inc();
    return res.status(400).json({ error: 'Username ve password gerekli' });
  }

  try {
    try {
      await usersDB.get(username);
      registerAttemptsTotal.labels('failed').inc();
      return res.status(400).json({ error: 'Kullanıcı zaten var' });
    } catch (err) {
      // Kullanıcı yok, devam et
    }

    await usersDB.insert({
      _id: username,
      username,
      password,
      createdAt: new Date().toISOString()
    });

    registerAttemptsTotal.labels('success').inc();
    await updateUserCount();
    
    res.json({ message: 'Kayıt başarılı', username });
  } catch (error) {
    console.error('Register error:', error);
    registerAttemptsTotal.labels('failed').inc();
    res.status(500).json({ error: 'Kayıt sırasında hata oluştu' });
  }
});

// Login - Giriş yap
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    loginAttemptsTotal.labels('failed').inc();
    return res.status(400).json({ error: 'Username ve password gerekli' });
  }

  try {
    const user = await usersDB.get(username);
    
    if (user.password !== password) {
      loginAttemptsTotal.labels('failed').inc();
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre yanlış' });
    }

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    loginAttemptsTotal.labels('success').inc();
    
    res.json({ token, message: 'Giriş başarılı' });
  } catch (error) {
    console.error('Login error:', error);
    loginAttemptsTotal.labels('failed').inc();
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
    console.log('Metrics endpoint: http://localhost:${PORT}/metrics');
  });
});