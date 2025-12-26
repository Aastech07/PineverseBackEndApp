// utils/sendPushNotification.js
import admin from '../firebase.js';

export async function sendPushNotification(token, title, body, data = {}) {
  if (!token) {
   console.log({token:token})
    console.log('sendPushNotification: no token provided, skipping');
    return null;
  }
  const tokens = "dmX7Q1g_SmWALfFTVL6tIC:APA91bGYxJ0uuCeZJOoVKGGenRuaFV-WkSuLkCErZOZ0ZHRC8ciTIUG8DxwSZS6rcTNB_pdxHSq8CS0fTUE406ebpG-iz8gZ0FwZreKhbB3O_ZxoRcAblEw"
  const message = {
    tokens,
    notification: {
      title: 'Static Notification Title',
      body: 'This is a static notification body'
    },


    data: Object?.keys(data || {})?.reduce((acc, k) => {
      // FCM data payload must be strings
      acc[k] = typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]);
      return acc;
    }, {}),

    android: {
      priority: 'high',
    },

    apns: {
      headers: {
        'apns-priority': '10',
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    // response is a message ID string
    return response;
  } catch (err) {
    console.error('Error sending push notification:', err);
    return null;
  }
}
