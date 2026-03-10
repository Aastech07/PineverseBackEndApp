// server.js
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import mime from 'mime-types';
// your project imports
import connectDB from './db/connectDB.js';
//import followRouter from './routes/follow.js';
//import admin from './firebase.js';
import User from './models/User.js';
import bidRoutes from './routes/BidRoutes.js';
import { uploadpdf } from './upload_pdf/uploadpdf.js';
import reviewRoutes from './routes/reviewRoutes.js';
import transactionRoutes from './routes/transactions.js';
import locationRoutes from './routes/locationRoutes.js';
import countRoutes from './routes/countRoutes.js';
import SkipRoute from './routes/SkipRoute.js';
// import socketRoutes from "./routes/socketRoutes.js";
// import { setSocketInstance } from "./controllers/socketController.js";
 
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
dotenv.config();

//setSocketInstance(io);

await connectDB();

app.use(cors());
app.use(express.json());
//app.use("/api/socket", socketRoutes);

// ========== UPLOADS SETUP ==========
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// serve static uploads
app.use('/uploads', express.static(uploadsDir));

// Multer config
const ALLOWED_MIMES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = mime.extension(file.mimetype) || '';
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${unique}.${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (Object.keys(ALLOWED_MIMES).includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'));
  }
});

// ========== SINGLE FILE UPLOAD (with optional caption) ==========
app.post('/uploadFile', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { caption = '' } = req.body;
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    res.json({
      success: true,
      attachment: {
        url: fileUrl,
        filename: req.file.originalname,
        mime: req.file.mimetype,
        size: req.file.size,
        caption: String(caption || '')
      }
    });
  } catch (err) {
    console.error('❌ upload error:', err.message);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// ========== MULTI FILE UPLOAD (with optional captions[]) ==========
app.post('/uploadFiles', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });

    let { captions } = req.body;
    if (typeof captions === 'string') {
      try {
        const maybeJson = JSON.parse(captions);
        captions = Array.isArray(maybeJson) ? maybeJson : [captions];
      } catch {
        captions = [captions];
      }
    } else if (!Array.isArray(captions)) {
      captions = [];
    }

    const attachments = req.files.map((f, idx) => {
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${f.filename}`;
      return {
        url: fileUrl,
        filename: f.originalname,
        mime: f.mimetype,
        size: f.size,
        caption: String(captions[idx] || '')
      };
    });

    res.json({ success: true, attachments });
  } catch (err) {
    console.error('❌ multi upload error:', err.message);
    res.status(500).json({ error: 'Files upload failed' });
  }
});

// ========== ROUTES ==========
app.use('/', uploadpdf);
app.use('/api', bidRoutes);
//app.use('/api', followRouter(io));
app.use('/api', reviewRoutes);
app.use('/api', locationRoutes);
app.use('/api', countRoutes)
app.use("/api", transactionRoutes);
app.use('/api', SkipRoute);

// ========== Mongoose Message Schema (with caption & activeStatus & negotiateAmount) ==========
const attachmentSchema = new mongoose.Schema(
  {
    url: String,
    filename: String,
    mime: String,
    size: Number,
    caption: { type: String, default: '' }
  },
  { _id: false }
);

const amountHistorySchema = new mongoose.Schema(
  {
    amount: { type: Number, default: 0 },
    addedBy: { type: String, default: '' }, // senderId jo amount add kar raha hai
    addedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    senderId: String,
    receiverId: String,
    text: { type: String, default: '' },
    attachments: { type: [attachmentSchema], default: [] },

    // message delivery status
    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent'
    },

    isRead: { type: Boolean, default: false },

    activeStatus: {
      type: String,
      enum: ['accept', 'negotiate', 'none'],
      default: 'none'
    },
  
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },

    // ✅ Current amount (single latest)
    getCurrentAmount: { type: Number, default: 0 },

    // ✅ All amounts history array
    amountHistory: { type: [amountHistorySchema], default: [] },
    // negotiated amount (optional)
    negotiateAmount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const Message = mongoose.model('Message', messageSchema);

// DEMO FCM token (fallback)
const DEMO_FCM_TOKEN =
  process.env.DEMO_FCM_TOKEN ||
  'dmX7Q1g_SmWALfFTVL6tIC:APA91bGYxJ0uuCeZJOoVKGGenRuaFV-WkSuLkCErZOZ0ZHRC8ciTIUG8DxwSZS6rcTNB_pdxHSq8CS0fTUE406ebpG-iz8gZ0FwZreKhbB3O_ZxoRcAblEw';

// Send Push Notification helper
async function sendPushNotification(token, title, body, data = {}) {
  try {
    const targetToken = token || DEMO_FCM_TOKEN;
    const message = {
      token: targetToken,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: { priority: 'high', notification: { sound: 'default' } },
      apns: { payload: { aps: { sound: 'default' } } }
    };
    // await admin.messaging().send(message);
    console.log(`✅ Push sent to ${targetToken}`);
  } catch (error) {
    console.error('❌ Push error:', error.message);
  }
}

// ========== User token routes ==========
app.post('/updateToken', async (req, res) => {
  const { userId, fcmToken } = req.body;
  try {
    await User.findOneAndUpdate(
      { userId },
      { fcmToken },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error updating token:', err.message);
    res.status(500).json({ error: 'Failed to update token' });
  }
});

app.get('/getUserToken/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findOne({ userId }).select('fcmToken');
    res.json(user || { fcmToken: null });
  } catch (err) {
    console.error('❌ Error fetching token:', err.message);
    res.status(500).json({ error: 'Failed to fetch token' });
  }
});

// ========== PAYMENT STATUS ROUTES & SOCKET ==========

// REST API: Update paymentStatus
app.post('/updatePaymentStatus', async (req, res) => {
  const { senderId, receiverId, paymentStatus } = req.body;
  try {
    if (!['pending', 'completed', 'failed'].includes(paymentStatus)) {
      return res.status(400).json({ error: 'Invalid paymentStatus' });
    }
    // Upsert - sender+receiver pair ke liye
    const updated = await Message.findOneAndUpdate(
      { senderId, receiverId },
      { senderId, receiverId, paymentStatus, text: '', status: 'sent', isRead: false, activeStatus: 'none', negotiateAmount: 0 },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const payload = {
      paymentStatus: updated.paymentStatus,
      senderId: updated.senderId,
      receiverId: updated.receiverId,
    };

    io.to(senderId).emit('payment_status_updated', payload);
    io.to(receiverId).emit('payment_status_updated', payload);

    res.json({ success: true, ...payload });
  } catch (err) {
    console.error('❌ Error updating paymentStatus:', err.message);
    res.status(500).json({ error: 'Failed to update paymentStatus' });
  }
});

app.get('/getPaymentStatus', async (req, res) => {
  const { senderId, receiverId } = req.query;
  try {
    const messages = await Message.find(
      {
        $or: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId }
        ]
      }
    ).select('paymentStatus senderId receiverId -_id');

    if (!messages.length) return res.status(404).json({ error: 'No payment status found' });

    const senderToReceiver = messages.find(m => m.senderId === senderId && m.receiverId === receiverId);
    const receiverToSender = messages.find(m => m.senderId === receiverId && m.receiverId === senderId);

    res.json({
      senderToReceiver: senderToReceiver
        ? { senderId: senderToReceiver.senderId, receiverId: senderToReceiver.receiverId, paymentStatus: senderToReceiver.paymentStatus }
        : null,
      receiverToSender: receiverToSender
        ? { senderId: receiverToSender.senderId, receiverId: receiverToSender.receiverId, paymentStatus: receiverToSender.paymentStatus }
        : null,
    });
  } catch (err) {
    console.error('❌ Error fetching paymentStatus:', err.message);
    res.status(500).json({ error: 'Failed to fetch paymentStatus' });
  }
});
// ========== SOCKET.IO ==========
io.on('connection', (socket) => {
  console.log(`🟢 User connected: ${socket.id}`);

  socket.on('join', ({ userId }) => {
    if (userId) {
      socket.join(userId);
      console.log(`User ${userId} joined their room`);
    }
  });

  // send_message supports attachments WITH captions + activeStatus + negotiateAmount
  socket.on('send_message', async (data) => {
    try {
      // expected:
      // { senderId, receiverId, text, username, attachments: [{url, filename, mime, size, caption}], activeStatus, negotiateAmount }
      const {
        senderId,
        receiverId,
        text = '',
        username,
        attachments = [],
        activeStatus = 'none',
        negotiateAmount = 0
      } = data;

      // ensure negotiateAmount is a Number (or 0)
      const negotiateVal =
        negotiateAmount === null || negotiateAmount === undefined
          ? 0
          : Number(negotiateAmount) || 0;

      const newMessage = new Message({
        senderId,
        receiverId,
        text,
        attachments,
        activeStatus,
        negotiateAmount: negotiateVal
      });

      const savedMessage = await newMessage.save();

      const formattedTime = savedMessage.createdAt.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });

      const payload = {
        _id: savedMessage._id,
        senderId,
        receiverId,
        text,
        attachments,
        timestamp: savedMessage.createdAt,
        time: formattedTime,
        status: savedMessage.status,
        activeStatus: savedMessage.activeStatus,
        negotiateAmount: savedMessage.negotiateAmount || 0
      };

      // emit to both sender and receiver
      io.to(receiverId).emit('receive_message', payload);
      io.to(senderId).emit('receive_message', payload);

      // unread count for receiver from this sender
      const unreadCount = await Message.countDocuments({
        receiverId,
        senderId,
        isRead: false
      });

      io.to(receiverId).emit('unread_count_update', {
        userId: receiverId,
        from: senderId,
        count: unreadCount
      });

      // push notification
      const recipientUser = await User.findOne({ userId: receiverId }).select('fcmToken');

      let notifyBody =
        (text && text.length ? text.slice(0, 100) : '') ||
        (attachments && attachments.length
          ? `${username || 'Someone'} sent an attachment`
          : 'You have a new message');

      await sendPushNotification(
        recipientUser?.fcmToken || DEMO_FCM_TOKEN,
        username || 'New Message',
        notifyBody,
        {
          type: 'chat_message',
          senderId,
          receiverId,
          messageId: savedMessage._id.toString(),
          hasAttachments: attachments.length ? '1' : '0',
          activeStatus: savedMessage.activeStatus || 'none',
          negotiateAmount: String(savedMessage.negotiateAmount || 0)
        }
      );
    } catch (err) {
      console.error('❌ Error saving message:', err.message);
    }
  });

  socket.on('message_delivered', async ({ messageId }) => {
    try {
      const updated = await Message.findByIdAndUpdate(messageId, { status: 'delivered' }, { new: true });
      if (updated) {
        // emit update only (scoped) - you can change to io.emit if you prefer global
        io.to(updated.receiverId).emit('message_status_update', { messageId, status: 'delivered' });
        io.to(updated.senderId).emit('message_status_update', { messageId, status: 'delivered' });
      } else {
        io.emit('message_status_update', { messageId, status: 'delivered' });
      }
    } catch (err) {
      console.error('❌ Error updating delivered:', err.message);
    }
  });

  socket.on('message_seen', async ({ messageId }) => {
    try {
      const updated = await Message.findByIdAndUpdate(
        messageId,
        { status: 'seen', isRead: true },
        { new: true }
      );
      if (updated) {
        io.to(updated.receiverId).emit('message_status_update', { messageId, status: 'seen' });
        io.to(updated.senderId).emit('message_status_update', { messageId, status: 'seen' });

        const unreadCount = await Message.countDocuments({
          receiverId: updated.receiverId,
          senderId: updated.senderId,
          isRead: false
        });

        io.to(updated.receiverId).emit('unread_count_update', {
          userId: updated.receiverId,
          from: updated.senderId,
          count: unreadCount
        });
      } else {
        // fallback emit
        io.emit('message_status_update', { messageId, status: 'seen' });
      }
    } catch (err) {
      console.error('❌ Error updating seen:', err.message);
    }
  });

  socket.on('mark_as_read', async ({ senderId, receiverId }) => {
    try {
      await Message.updateMany(
        { senderId, receiverId, isRead: false },
        { isRead: true, status: 'seen' }
      );

      io.to(receiverId).emit('unread_count_update', {
        userId: receiverId,
        from: senderId,
        count: 0
      });
    } catch (err) {
      console.error('❌ Error marking as read:', err.message);
    }
  });
  
  socket.on('transaction_updated', async (data) => {
    try {
      const {
        senderId,
        receiverId,
        finalPrice,
        ActiveStatus,           // "Accept" ya "ACCEPT" ya "accept"
        meta = {},
      } = data;

      if (!senderId || !receiverId) {
        console.log("❌ transaction_updated → missing senderId or receiverId");
        return;
      }

      const normalizedStatus = String(ActiveStatus || '').toLowerCase().trim();

      console.log(`[TXN] ${senderId} → ${receiverId} | Status: ${normalizedStatus} | ₹${finalPrice || '?'}`);

      const broadcastPayload = {
        finalPrice: finalPrice ?? null,
        ActiveStatus: normalizedStatus === 'accept' ? 'Accept' : normalizedStatus,
        normalizedStatus,
        fromUser: senderId,
        meta,
        timestamp: new Date().toISOString(),
      };

      // Dono ko bhejo — important!
      io.to(senderId).emit('transaction_updated', broadcastPayload);
      io.to(receiverId).emit('transaction_updated', broadcastPayload);

      // Optional: Agar accept hua to saare pending messages ko seen kar do
      if (normalizedStatus === 'accept') {
        await Message.updateMany(
          {
            $or: [
              { senderId, receiverId },
              { senderId: receiverId, receiverId: senderId }
            ],
            isRead: false
          },
          { isRead: true, status: 'seen' }
        );

        // Reset unread counts
        io.to(senderId).emit('unread_count_update', { userId: senderId, from: receiverId, count: 0 });
        io.to(receiverId).emit('unread_count_update', { userId: receiverId, from: senderId, count: 0 });
      }

    } catch (err) {
      console.error("❌ transaction_updated socket error:", err);
    }
  });

  // ✅ REALTIME PAYMENT STATUS UPDATE - place inside io.on('connection', ...) block
  socket.on('update_payment_status', async ({ senderId, receiverId, paymentStatus }) => {
    try {
      if (!['pending', 'completed', 'failed'].includes(paymentStatus)) {
        socket.emit('payment_status_error', { error: 'Invalid paymentStatus' });
        return;
      }

      if (!senderId || !receiverId) {
        socket.emit('payment_status_error', { error: 'Missing senderId or receiverId' });
        return;
      }

      const updated = await Message.findOneAndUpdate(
        { senderId, receiverId },
        {
          senderId,
          receiverId,
          paymentStatus,
          text: '',
          status: 'sent',
          isRead: false,
          activeStatus: 'none',
          negotiateAmount: 0
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      const payload = {
        senderId: updated.senderId,
        receiverId: updated.receiverId,
        paymentStatus: updated.paymentStatus,
        timestamp: new Date().toISOString(),
      };

      // Emit to BOTH sender and receiver — same as get_payment_status pattern
      io.to(senderId).emit('payment_status_updated', payload);
      io.to(receiverId).emit('payment_status_updated', payload);

      console.log(`[PAYMENT] ${senderId} → ${receiverId} | Status: ${paymentStatus}`);

    } catch (err) {
      console.error('❌ Socket update_payment_status error:', err.message);
      socket.emit('payment_status_error', { error: 'Failed to update payment status' });
    }
  });
  // SOCKET: Realtime paymentStatus update
  socket.on('get_payment_status', async ({ senderId, receiverId }) => {
    try {
      const messages = await Message.find({
        $or: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId }
        ]
      }).sort({ createdAt: -1 }).select('paymentStatus senderId receiverId createdAt');

      // Agar koi message nahi mila
      if (!messages.length) {
        socket.emit('payment_status_result', {
          senderToReceiver: { senderId, receiverId, paymentStatus: 'pending' },
          receiverToSender: { senderId: receiverId, receiverId: senderId, paymentStatus: 'pending' }
        });
        return;
      }

      const senderToReceiver = messages.find(
        m => String(m.senderId) === String(senderId) && String(m.receiverId) === String(receiverId)
      );
      const receiverToSender = messages.find(
        m => String(m.senderId) === String(receiverId) && String(m.receiverId) === String(senderId)
      );

      const payload = {
        senderToReceiver: {
          senderId,
          receiverId,
          paymentStatus: senderToReceiver?.paymentStatus || 'pending'
        },
        receiverToSender: {
          senderId: receiverId,
          receiverId: senderId,
          paymentStatus: receiverToSender?.paymentStatus || 'pending'
        }
      };

      io.to(senderId).emit('payment_status_result', payload);
      io.to(receiverId).emit('payment_status_result', payload);

    } catch (err) {
      console.error('❌ Socket get_payment_status error:', err.message);
      socket.emit('payment_status_error', { error: 'Failed to fetch payment status' });
    }
  });

  // ✅ REALTIME - Amount array me add karo
  socket.on('add_amount_history', async ({ senderId, receiverId, amount, addedBy }) => {
    try {
      if (!senderId || !receiverId) {
        socket.emit('amount_history_error', { error: 'Missing senderId or receiverId' });
        return;
      }
      if (amount === undefined || isNaN(Number(amount))) {
        socket.emit('amount_history_error', { error: 'Invalid amount' });
        return;
      }

      const newEntry = {
        amount: Number(amount),
        addedBy: addedBy || senderId,
        addedAt: new Date()
      };

      const updated = await Message.findOneAndUpdate(
        { senderId, receiverId },
        {
          $push: { amountHistory: newEntry },
          $set: { getCurrentAmount: Number(amount) }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      const payload = {
        senderId: updated.senderId,
        receiverId: updated.receiverId,
        getCurrentAmount: updated.getCurrentAmount,
        amountHistory: updated.amountHistory,
        latestEntry: newEntry,
        timestamp: new Date().toISOString()
      };

      // ✅ Dono ko realtime bhejo
      io.to(senderId).emit('amount_history_updated', payload);
      io.to(receiverId).emit('amount_history_updated', payload);

      console.log(`[HISTORY] ${senderId} → ${receiverId} | ₹${amount} added`);
    } catch (err) {
      console.error('❌ add_amount_history error:', err.message);
      socket.emit('amount_history_error', { error: 'Failed to add amount' });
    }
  });

  // ✅ REALTIME - Saari history fetch karo
  socket.on('get_amount_history', async ({ senderId, receiverId }) => {
    try {
      if (!senderId || !receiverId) {
        socket.emit('amount_history_error', { error: 'Missing senderId or receiverId' });
        return;
      }

      const messages = await Message.find({
        $or: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId }
        ]
      }).select('amountHistory getCurrentAmount senderId receiverId');

      const senderToReceiver = messages.find(
        m => String(m.senderId) === String(senderId) && String(m.receiverId) === String(receiverId)
      );
      const receiverToSender = messages.find(
        m => String(m.senderId) === String(receiverId) && String(m.receiverId) === String(senderId)
      );

      const payload = {
        senderToReceiver: {
          senderId,
          receiverId,
          getCurrentAmount: senderToReceiver?.getCurrentAmount ?? 0,
          amountHistory: senderToReceiver?.amountHistory ?? []
        },
        receiverToSender: {
          senderId: receiverId,
          receiverId: senderId,
          getCurrentAmount: receiverToSender?.getCurrentAmount ?? 0,
          amountHistory: receiverToSender?.amountHistory ?? []
        }
      };

      io.to(senderId).emit('amount_history_result', payload);
      io.to(receiverId).emit('amount_history_result', payload);

    } catch (err) {
      console.error('❌ get_amount_history error:', err.message);
      socket.emit('amount_history_error', { error: 'Failed to get amount history' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔴 User disconnected: ${socket.id}`);
  });
});

// ========== MESSAGE & CHAT ROUTES ==========

app.post('/getMessages', async (req, res) => {
  const { senderId, receiverId } = req.body;

  const formatTime = (date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDateLabel = (date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const msgDate = new Date(date);

    if (msgDate.toDateString() === today.toDateString()) return 'Today';
    if (msgDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return msgDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  try {
    const messages = await mongoose
      .model('Message')
      .find({
        $or: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId }
        ]
      })
      .sort({ createdAt: 1 });

    const grouped = [];
    let currentLabel = '';

    messages.forEach((msg) => {
      const label = formatDateLabel(msg.createdAt);
      if (label !== currentLabel) {
        grouped.push({ type: 'label', label });
        currentLabel = label;
      }
      grouped.push({
        type: 'message',
        _id: msg._id,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        text: msg.text,
        attachments: msg.attachments || [],
        status: msg.status,
        isRead: msg.isRead,
        activeStatus: msg.activeStatus || 'none',
        negotiateAmount: msg.negotiateAmount || 0,
        timestamp: msg.createdAt,
        time: formatTime(msg.createdAt)
      });
    });

    res.json(grouped);
  } catch (err) {
    console.error('❌ Failed to fetch messages:', err.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/chatUsers', async (req, res) => {
  const { userId } = req.body;
  try {
    const messages = await mongoose
      .model('Message')
      .find({
        $or: [{ senderId: userId }, { receiverId: userId }]
      })
      .sort({ createdAt: -1 });

    const unique = new Map();
    messages.forEach((msg) => {
      const participants = [msg.senderId, msg.receiverId].sort().join('_');
      if (!unique.has(participants)) {
        const chatWith = msg.senderId === userId ? msg.receiverId : msg.senderId;

        const baseLastMessage =
          msg.text ||
          (msg.attachments?.length
            ? msg.attachments[0].caption
              ? `Attachment: ${msg.attachments[0].caption}`
              : 'Attachment'
            : '');

        const lastMessage =
          msg.activeStatus && msg.activeStatus !== 'none'
            ? `${baseLastMessage || 'Status'} [${msg.activeStatus}]`
            : baseLastMessage;

        unique.set(participants, {
          chatWith,
          lastMessage,
          status: msg.status,
          time: msg.createdAt.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }),
          timestamp: msg.createdAt,
          unreadCount: 0
        });
      }
    });

    const unreadCounts = await mongoose
      .model('Message')
      .aggregate([
        { $match: { receiverId: userId, isRead: false } },
        { $group: { _id: '$senderId', count: { $sum: 1 } } }
      ]);

    const unreadMap = {};
    unreadCounts.forEach((u) => (unreadMap[u._id] = u.count));

    const chatList = Array.from(unique.values()).map((chat) => ({
      ...chat,
      unreadCount: unreadMap[chat.chatWith] || 0
    }));

    res.json(chatList);
  } catch (err) {
    console.error('❌ Failed to fetch chat users:', err.message);
    res.status(500).json({ error: 'Failed to fetch chat users' });
  }
});

app.post('/unreadCounts', async (req, res) => {
  const { userId } = req.body;
  try {
    const unread = await mongoose
      .model('Message')
      .aggregate([
        { $match: { receiverId: userId, isRead: false } },
        { $group: { _id: '$senderId', count: { $sum: 1 } } }
      ]);

    const unreadMap = {};
    unread.forEach((item) => (unreadMap[item._id] = item.count));
    res.json(unreadMap);
  } catch (err) {
    console.error('❌ Error fetching unread counts:', err.message);
    res.status(500).json({ error: 'Failed to fetch unread counts' });
  }
});

// ========== CURRENT AMOUNT ROUTES ==========

// ========== AMOUNT HISTORY ROUTES ==========

// ✅ POST - Naya amount array me push karo
app.post('/addAmountHistory', async (req, res) => {
  const { senderId, receiverId, amount, addedBy } = req.body;
  try {
    if (!senderId || !receiverId) {
      return res.status(400).json({ error: 'senderId and receiverId required' });
    }
    if (amount === undefined || isNaN(Number(amount))) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const newEntry = {
      amount: Number(amount),
      addedBy: addedBy || senderId,
      addedAt: new Date()
    };

    const updated = await Message.findOneAndUpdate(
      { senderId, receiverId },
      {
        $push: { amountHistory: newEntry },       // ✅ Array me push
        $set: { getCurrentAmount: Number(amount) } // ✅ Current amount bhi update
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const payload = {
      senderId: updated.senderId,
      receiverId: updated.receiverId,
      getCurrentAmount: updated.getCurrentAmount,
      amountHistory: updated.amountHistory,
      latestEntry: newEntry,
      timestamp: new Date().toISOString()
    };

    // ✅ Realtime dono ko bhejo
    io.to(senderId).emit('amount_history_updated', payload);
    io.to(receiverId).emit('amount_history_updated', payload);

    res.json({ success: true, ...payload });
  } catch (err) {
    console.error('❌ Error adding amount history:', err.message);
    res.status(500).json({ error: 'Failed to add amount history' });
  }
});

// ✅ GET - Saari amount history fetch karo
app.get('/getAmountHistory', async (req, res) => {
  const { senderId, receiverId } = req.query;
  try {
    if (!senderId || !receiverId) {
      return res.status(400).json({ error: 'senderId and receiverId required' });
    }

    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    }).select('amountHistory getCurrentAmount senderId receiverId');

    const senderToReceiver = messages.find(
      m => String(m.senderId) === String(senderId) && String(m.receiverId) === String(receiverId)
    );
    const receiverToSender = messages.find(
      m => String(m.senderId) === String(receiverId) && String(m.receiverId) === String(senderId)
    );

    res.json({
      senderToReceiver: {
        senderId,
        receiverId,
        getCurrentAmount: senderToReceiver?.getCurrentAmount ?? 0,
        amountHistory: senderToReceiver?.amountHistory ?? []
      },
      receiverToSender: {
        senderId: receiverId,
        receiverId: senderId,
        getCurrentAmount: receiverToSender?.getCurrentAmount ?? 0,
        amountHistory: receiverToSender?.amountHistory ?? []
      }
    });
  } catch (err) {
    console.error('❌ Error fetching amount history:', err.message);
    res.status(500).json({ error: 'Failed to fetch amount history' });
  }
});

// ✅ DELETE - Poori history clear karo (optional)
app.post('/clearAmountHistory', async (req, res) => {
  const { senderId, receiverId } = req.body;
  try {
    const updated = await Message.findOneAndUpdate(
      { senderId, receiverId },
      { $set: { amountHistory: [], getCurrentAmount: 0 } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Record not found' });

    const payload = {
      senderId,
      receiverId,
      amountHistory: [],
      getCurrentAmount: 0,
      timestamp: new Date().toISOString()
    };

    io.to(senderId).emit('amount_history_cleared', payload);
    io.to(receiverId).emit('amount_history_cleared', payload);

    res.json({ success: true, ...payload });
  } catch (err) {
    console.error('❌ Error clearing amount history:', err.message);
    res.status(500).json({ error: 'Failed to clear amount history' });
  }
});
// ========== ADD THIS INSIDE io.on('connection', (socket) => { ... }) ==========
// Place this AFTER the existing socket.on('mark_as_read', ...) block and BEFORE socket.on('disconnect', ...)

// ✅ REALTIME DEAL ACCEPTANCE - broadcasts to BOTH sender and receiver


// ========== START SERVER ==========
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
