const express = require('express');
const apn = require('apn');
const fs = require('fs');

const app = express();
app.use(express.json());

// APNs yapılandırması
const options = {
  token: {
    key: fs.readFileSync('./AuthKey.p8', 'utf8'),
    keyId: '58BJ8X9WG6',
    teamId: 'GD7JVN8P6N'
  },
  production: false
};

const apnProvider = new apn.Provider(options);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Push notification gönderme endpoint'i
app.post('/send-notification', async (req, res) => {
  try {
    const { deviceToken, title, body, badge, sound, data } = req.body;

    if (!deviceToken) {
      return res.status(400).json({ error: 'Device token gerekli' });
    }

    const notification = new apn.Notification();
    notification.alert = {
      title: title || 'Bildirim',
      body: body || 'Yeni bir mesajınız var'
    };
    notification.badge = badge || 1;
    notification.sound = sound || 'default';
    notification.topic = 'com.may.atlas.Atlas';
    notification.payload = data || {};

    const result = await apnProvider.send(notification, deviceToken);

    if (result.failed.length > 0) {
      console.error('Hata:', result.failed[0].response);
      return res.status(500).json({
        success: false,
        error: result.failed[0].response
      });
    }

    res.json({
      success: true,
      sent: result.sent.length,
      failed: result.failed.length
    });

  } catch (error) {
    console.error('Push notification hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toplu bildirim gönderme
app.post('/send-bulk-notification', async (req, res) => {
  try {
    const { deviceTokens, title, body, badge, sound, data } = req.body;

    if (!deviceTokens || !Array.isArray(deviceTokens)) {
      return res.status(400).json({ error: 'Device tokens array gerekli' });
    }

    const notification = new apn.Notification();
    notification.alert = {
      title: title || 'Bildirim',
      body: body || 'Yeni bir mesajınız var'
    };
    notification.badge = badge || 1;
    notification.sound = sound || 'default';
    notification.topic = 'com.may.atlas.Atlas';
    notification.payload = data || {};

    const result = await apnProvider.send(notification, deviceTokens);

    res.json({
      success: true,
      sent: result.sent.length,
      failed: result.failed.length,
      failedDevices: result.failed.map(f => ({
        device: f.device,
        error: f.response
      }))
    });

  } catch (error) {
    console.error('Bulk push notification hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 8083;
app.listen(PORT, () => {
  console.log(`Push notification servisi ${PORT} portunda çalışıyor`);
});
