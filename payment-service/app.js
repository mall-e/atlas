const { Kafka } = require('kafkajs');

// Kafka yapılandırması
const kafka = new Kafka({
  clientId: 'payment-service',
  brokers: ['kafka:9092']
});

const consumer = kafka.consumer({ groupId: 'payment-service-group' });
const producer = kafka.producer();

async function processPayment(orderData) {
  const { order_id, total } = orderData;
  
  console.log(`\n📨 Yeni sipariş alındı: ${order_id}`);
  console.log(`💰 Tutar: ${total} TL`);
  console.log('⏳ Ödeme işleniyor...');
  
  // 1 saniye bekle (ödeme işleniyor simülasyonu)
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Her zaman başarılı!
  console.log('✅ Ödeme başarılı!');
  
  // Kafka'ya başarı mesajı gönder
  await producer.send({
    topic: 'payment-completed',
    messages: [
      {
        key: order_id,
        value: JSON.stringify({
          order_id,
          status: 'success',
          amount: total,
          message: 'Ödeme başarıyla tamamlandı',
          completed_at: new Date().toISOString()
        })
      }
    ]
  });
  
  console.log(`📤 Order Service'e bilgi gönderildi: ${order_id}`);
}

async function start() {
  try {
    // Producer'ı bağla
    await producer.connect();
    console.log('✅ Kafka Producer bağlandı');
    
    // Consumer'ı bağla
    await consumer.connect();
    console.log('✅ Kafka Consumer bağlandı');
    
    // Topic'e subscribe ol
    await consumer.subscribe({ topic: 'order-created', fromBeginning: true });
    console.log('📡 "order-created" topic\'i dinleniyor...\n');
    
    // Mesajları işle
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const orderData = JSON.parse(message.value.toString());
        await processPayment(orderData);
      },
    });
    
    console.log('💳 Payment Service başladı ve Kafka\'yı dinliyor...\n');
    
  } catch (err) {
    console.error('❌ Başlatma hatası:', err);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\nKapatılıyor...');
  await consumer.disconnect();
  await producer.disconnect();
  process.exit(0);
});
