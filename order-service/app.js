const express = require('express');
const { Kafka } = require('kafkajs');
const nano = require('nano');

const app = express();
app.use(express.json());

// CouchDB bağlantısı
const couchdb = nano('http://admin:password123@couchdb:5984');
let ordersDb;

// Kafka yapılandırması
const kafka = new Kafka({
  clientId: 'order-service',
  brokers: ['kafka:9092']
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'order-service-group' });

// Database'i başlat
async function initDatabase() {
  try {
    ordersDb = couchdb.use('orders');
  } catch (err) {
    await couchdb.db.create('orders');
    ordersDb = couchdb.use('orders');
  }
  console.log('✅ CouchDB bağlantısı kuruldu');
}

// Kafka Producer'ı başlat
async function initProducer() {
  await producer.connect();
  console.log('✅ Kafka Producer bağlandı');
}

// Kafka Consumer'ı başlat (ödeme sonuçlarını dinle)
async function initConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'payment-completed', fromBeginning: true });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const data = JSON.parse(message.value.toString());
      console.log('✅ Ödeme tamamlandı:', data);
      
      try {
        // Siparişi güncelle
        const order = await ordersDb.get(data.order_id);
        order.status = 'paid';
        order.payment_completed_at = new Date().toISOString();
        await ordersDb.insert(order);
        console.log(`✅ Sipariş ${data.order_id} ödendi olarak güncellendi`);
      } catch (err) {
        console.error('❌ Sipariş güncelleme hatası:', err.message);
      }
    },
  });
  
  console.log('✅ Kafka Consumer başlatıldı (payment-completed dinleniyor)');
}

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'order-service' });
});

// Sepete ürün ekle
app.post('/cart/add', async (req, res) => {
  try {
    const { user_id, product_id, product_name, quantity = 1, price = 100 } = req.body;
    
    if (!user_id || !product_id) {
      return res.status(400).json({ error: 'user_id ve product_id gerekli' });
    }
    
    const cartId = `cart_${user_id}`;
    let cart;
    
    try {
      cart = await ordersDb.get(cartId);
    } catch (err) {
      // Yeni sepet oluştur
      cart = {
        _id: cartId,
        user_id,
        items: [],
        created_at: new Date().toISOString()
      };
    }
    
    // Ürün zaten sepette mi?
    const existingItem = cart.items.find(item => item.product_id === product_id);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product_id,
        product_name: product_name || 'Ürün',
        quantity,
        price
      });
    }
    
    cart.updated_at = new Date().toISOString();
    await ordersDb.insert(cart);
    
    res.json({
      message: '✅ Ürün sepete eklendi',
      cart
    });
  } catch (err) {
    console.error('Sepete ekleme hatası:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sepeti getir
app.get('/cart/:user_id', async (req, res) => {
  try {
    const cartId = `cart_${req.params.user_id}`;
    const cart = await ordersDb.get(cartId);
    res.json(cart);
  } catch (err) {
    res.status(404).json({ message: 'Sepet bulunamadı' });
  }
});

// Sipariş oluştur (Kafka'ya gönder)
app.post('/order/create', async (req, res) => {
  try {
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id gerekli' });
    }
    
    const cartId = `cart_${user_id}`;
    let cart;
    
    try {
      cart = await ordersDb.get(cartId);
    } catch (err) {
      return res.status(404).json({ error: 'Sepet bulunamadı' });
    }
    
    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({ error: 'Sepet boş' });
    }
    
    // Toplam tutarı hesapla
    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Sipariş oluştur
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const order = {
      _id: orderId,
      user_id,
      items: cart.items,
      total,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    await ordersDb.insert(order);
    
    // 🔥 KAFKA'YA MESAJ GÖNDER
    await producer.send({
      topic: 'order-created',
      messages: [
        {
          key: orderId,
          value: JSON.stringify({
            order_id: orderId,
            user_id,
            total,
            items: cart.items
          })
        }
      ]
    });
    
    console.log(`📨 Kafka'ya gönderildi: order-created - ${orderId}`);
    
    // Sepeti temizle
    cart.items = [];
    await ordersDb.insert(cart);
    
    res.status(201).json({
      message: '✅ Sipariş oluşturuldu! Ödeme işleniyor...',
      order_id: orderId,
      status: 'pending',
      total
    });
  } catch (err) {
    console.error('Sipariş oluşturma hatası:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sipariş detayını getir
app.get('/order/:order_id', async (req, res) => {
  try {
    const order = await ordersDb.get(req.params.order_id);
    res.json(order);
  } catch (err) {
    res.status(404).json({ error: 'Sipariş bulunamadı' });
  }
});

// Kullanıcının tüm siparişlerini getir
app.get('/orders/:user_id', async (req, res) => {
  try {
    const result = await ordersDb.list({ include_docs: true });
    const orders = result.rows
      .filter(row => row.id.startsWith('order_') && row.doc.user_id === req.params.user_id)
      .map(row => row.doc);
    
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sunucuyu başlat
const PORT = 5000;

async function start() {
  try {
    await initDatabase();
    await initProducer();
    await initConsumer();
    
    app.listen(PORT, () => {
      console.log(`🚀 Order Service çalışıyor: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Başlatma hatası:', err);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Kapatılıyor...');
  await producer.disconnect();
  await consumer.disconnect();
  process.exit(0);
});
