require('dotenv').config(); 
const functions = require("firebase-functions");
const { OpenAI } = require("openai");
const admin = require("firebase-admin");
const moment = require("moment-timezone");
const axios = require("axios");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");

admin.initializeApp();


// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,

});

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

exports.getChatResponse = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message, model = "gpt-3.5-turbo" } = req.body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are Skylar, a friendly and knowledgeable weather assistant. When answering weather-related questions, be direct and specific, using the actual weather data provided. Only mention being a weather assistant if the question is not weather-related."
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 300,
      temperature: 0.8,
    });

    // Return the response
    res.status(200).json({
      success: true,
      response: completion.choices[0].message.content,
      model: model,
      usage: completion.usage
    });

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Handle different types of errors
    if (error.status === 401) {
      res.status(401).json({ error: 'Invalid OpenAI API key' });
    } else if (error.status === 429) {
      res.status(429).json({ error: 'OpenAI API rate limit exceeded' });
    } else if (error.status === 500) {
      res.status(500).json({ error: 'OpenAI API server error' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

exports.saveDeviceData = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { deviceId, token, timezone, location, city } = req.body;

  if (!deviceId) {
    return res.status(400).send('Missing deviceId');
  }

  const updateData = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (token) updateData.token = token;
  if (timezone) updateData.timezone = timezone;
  if (location) updateData.location = location;
  if (city) updateData.city = city;

  try {
    await admin.firestore().collection('deviceTokens').doc(deviceId).set(updateData, { merge: true });
    return res.status(200).send('Device data saved');
  } catch (error) {
    console.error('❌ Error saving device data:', error);
    return res.status(500).send('Failed to save device data');
  }
});

// Function to save FCM token for push notifications
exports.saveDeviceToken = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { deviceId, token } = req.body;

  if (!deviceId || !token) {
    return res.status(400).json({ success: false, error: 'Missing deviceId or token' });
  }

  try {
    // Save FCM token to Firestore
    await admin.firestore().collection('deviceTokens').doc(deviceId).set({
      token,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`✅ FCM token saved for device: ${deviceId}`);
    return res.status(200).json({ success: true, message: 'FCM token saved successfully' });
  } catch (error) {
    console.error('❌ Error saving FCM token:', error);
    return res.status(500).json({ success: false, error: 'Failed to save FCM token' });
  }
});

// Send a test notification to a specific device
exports.sendTestNotification = functions.https.onCall(async (data, context) => {
  const { deviceId } = data;
  
  if (!deviceId) {
    throw new functions.https.HttpsError('invalid-argument', 'Device ID is required');
  }
  
  try {
    // Get the device token from Firestore
    const deviceDoc = await admin.firestore().collection('deviceTokens').doc(deviceId).get();
    
    if (!deviceDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Device not found');
    }
    
    const deviceData = deviceDoc.data();
    
    if (!deviceData.token) {
      throw new functions.https.HttpsError('failed-precondition', 'Device has no FCM token');
    }
    
    // Send a test notification
    await admin.messaging().send({
      token: deviceData.token,
      notification: {
        title: 'Weather Alert Test',
        body: 'This is a test notification from Skylar Weather App',
      },
      android: {
        priority: 'high',
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    });
    
    return { success: true, message: 'Test notification sent' };
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send test notification', error);
  }
});

async function generateNotificationMessage({ temp, condition, city }) {
  const prompt = `You are a friendly weather assistant. Create a concise, cheerful one-sentence morning weather update for ${city}, where the temperature is ${Math.round(temp)}°C and the condition is ${condition.toLowerCase()}. Include a clothing tip.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful and warm weather assistant." },
        { role: "user", content: prompt }
      ],
      max_tokens: 50,
      temperature: 0.7
    });

    return response.choices[0].message.content.trim();
  } catch (error) {

    console.error("❌ OpenAI Error:", error.message);
    return `${Math.round(temp)}°C and ${condition.toLowerCase()} in ${city}. Consider dressing appropriately — maybe a warm jacket or light layers depending on the breeze.`;
  } // fallback
  }

  exports.sendMorningNotifications = async () => {
    const db = admin.firestore();
    const snapshot = await db.collection("deviceTokens").get();
    const nowUTC = moment.utc();
    const promises = [];
  
    snapshot.forEach(doc => {
      const data = doc.data();
      const {
        token,
        timezone,
        city = 'your area',
        weather = null,
        lastNotifiedDate = null // Optional: used to prevent duplicates
      } = data;
  
      if (!token || !timezone || !weather) return;
  
      const localTime = nowUTC.clone().tz(timezone);


      // const isExactlyEightAM = true;
      const isExactlyEightAM = localTime.hour() === 8 ;
      
      // Avoid sending multiple times — only send once per day
      const today = localTime.format('YYYY-MM-DD');
      if (!isExactlyEightAM || lastNotifiedDate === today) return;
  
      const bodyTextPromise = generateNotificationMessage({
        temp: weather.temp,
        condition: weather.condition,
        city
      });
  
      promises.push(
        bodyTextPromise.then(async bodyText => {
          const message = {
            token,
            notification: {
              title: "🌤️ Your Day Plan is Ready!",
              body: bodyText
            },
            data: {
              category: 'daily_plan',
              screen: 'home'
            }
          };
  
          try {
            await admin.messaging().send(message);
            // ✅ Save that we sent today
            await db.collection("deviceTokens").doc(doc.id).update({
              // lastNotifiedDate: today
            });
          } catch (err) {
            console.error("❌ FCM error for token:", token, err.message);
          }
        })
      );
    });
  
    await Promise.all(promises);
    console.log(`✅ Sent ${promises.length} notifications`);
  };

  exports.hourlyNotificationScheduler = onSchedule(
    { schedule: 'every 60 minutes', timeZone: 'UTC' },
    async () => {
      try {
        await exports.sendMorningNotifications();
      } catch (err) {
        console.error("❌ Scheduled error", err);
      }
    }
  );
  

// 🔬 Manual Test Endpoint (call via browser/Postman)
exports.testMorningNotifications = onRequest(async (req, res) => {
  try {
    await exports.sendMorningNotifications();
    res.status(200).send("✅ Test notifications sent");
  } catch (error) {
    console.error("❌ Test notification error:", error);
    res.status(500).send("❌ Failed to send test notifications");
  }
});


exports.updateUserWeather = onSchedule(
  { schedule: 'every 60 minutes', timeZone: 'UTC' },
  async () => {
    const db = admin.firestore();
    const snapshot = await db.collection("deviceTokens").get();

    const updatePromises = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const { location } = data; // location must include lat & lon

      if (!location || !location.lat || !location.lng) return;

      const { lat, lng } = location;

      const weatherPromise = axios
        .get(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${OPENWEATHER_API_KEY}`
        )
        .then((res) => {
          const weather = {
            temp: res.data.main.temp,
            condition: res.data.weather[0].main,
            windSpeed: res.data.wind.speed,
          };

          return doc.ref.update({ weather });
        })
        .catch((err) => {
          console.error("❌ Weather fetch failed for doc:", doc.id, err.message);
        });

      updatePromises.push(weatherPromise);
    });

    await Promise.all(updatePromises);
    console.log(`✅ Updated weather for ${updatePromises.length} users`);
  }
);

// Manual trigger to test weather update
exports.testUpdateWeather = onRequest(async (req, res) => {
  try {
    await exports.updateUserWeather.run();
    res.status(200).send("✅ Weather update triggered");
  } catch (error) {
    console.error("❌ Error triggering weather update:", error);
    res.status(500).send("❌ Failed to update weather");
  }
});

exports.deleteDeviceToken = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).send('Missing deviceId');

    const deviceRef = admin.firestore().collection('deviceTokens').doc(deviceId);
    const doc = await deviceRef.get();

    if (!doc.exists) {
      return res.status(404).send('No matching device found');
    }

    // Update the document to remove the token field
    await deviceRef.update({
      token: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).send('Device token deleted');
  } catch (error) {
    console.error('Error deleting token:', error);
    return res.status(500).send('Internal server error');
  }
});

