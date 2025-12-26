// routes/followRouter.js
const express = require('express');
const Follow = require('../models/User.js');
const Notification = require('../models/notificationModel.js');

const router = express.Router();

function followRouter(io) {
  // ========== FOLLOW ==========
  router.post('/follow', async (req, res) => {
    const { followerId, followingId, userId, item_id } = req.body;
    if (!followerId || !followingId || !userId || !item_id) {
      return res.status(400).json({ message: 'Missing followerId, followingId, userId or item_id' });
    }
    if (followerId === followingId) return res.status(400).json({ message: "You can't follow yourself" });

    try {
      const existing = await Follow.findOne({ follower: followerId, following: followingId });
      if (existing) {
        if (existing.status === false) return res.status(400).json({ message: 'Follow request already pending' });
        return res.status(400).json({ message: 'Already following' });
      }

      const follow = new Follow({ follower: followerId, following: followingId, userId, item_id, status: false });
      await follow.save();

      const notification = new Notification({
        recipient: followingId,
        sender: followerId,
        type: 'follow_request',
        message: `User ${followerId} has sent you a follow request`,
        read: false,
        data: { followerId, followingId, item_id }
      });
      await notification.save();

      const notificationData = {
        ...notification.toObject(),
        item_id
      };

      io.to(followingId).emit('follow_request', notificationData);
      io.to(`notifications_${followingId}`).emit('new_notification', notificationData);

      res.json({ message: 'Follow request sent', follow, notification: notificationData });
    } catch (err) {
      console.error('Error in /follow:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ========== ACCEPT ==========
router.post('/accept', async (req, res) => {
  const { followerId, followingId, item_id } = req.body;
  if (!followerId || !followingId || !item_id) {
    return res.status(400).json({ message: 'Missing followerId, followingId or item_id' });
  }

  try {
    // find only the request from follower → following
    const follow = await Follow.findOne({ follower: followerId, following: followingId, item_id });
    if (!follow) return res.status(404).json({ message: 'Follow request not found' });

    // mark request as accepted
    follow.status = true;
    await follow.save();

    // ✅ reciprocal logic removed (no double entry now)

    const notification = new Notification({
      recipient: followerId,
      sender: followingId,
      type: 'follow_accepted',
      message: `User ${followingId} has accepted your follow request`,
      read: false,
      data: { followerId, followingId, item_id }
    });
    await notification.save();

    const notificationData = {
      ...notification.toObject(),
      item_id
    };

    io.to(followerId).emit('follow_accepted', notificationData);
    io.to(`notifications_${followerId}`).emit('new_notification', notificationData);

    res.json({ message: 'Follow request accepted', follow, notification: notificationData });
  } catch (err) {
    console.error('Error in /accept:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

  // ========== UNFOLLOW ==========
  router.delete('/unfollow', async (req, res) => {
    const { followerId, followingId, item_id } = req.body;
    if (!followerId || !followingId || !item_id) return res.status(400).json({ message: 'Invalid followerId, followingId or item_id' });

    try {
      const result = await Follow.deleteMany({
        $or: [
          { follower: followerId, following: followingId, item_id },
          { follower: followingId, following: followerId, item_id }
        ]
      });

      if (result.deletedCount === 0) return res.status(404).json({ message: 'Follow relationship not found' });

      const notification = new Notification({
        recipient: followingId,
        sender: followerId,
        type: 'unfollow',
        message: `User ${followerId} has unfollowed you`,
        read: false,
        data: { followerId, followingId, item_id }
      });
      await notification.save();

      const notificationData = {
        ...notification.toObject(),
        item_id
      };

      io.to(followingId).emit('unfollow', notificationData);
      io.to(`notifications_${followingId}`).emit('new_notification', notificationData);

      res.json({ message: 'Unfollowed successfully', deletedCount: result.deletedCount, notification: notificationData });
    } catch (err) {
      console.error('Error in /unfollow:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ========== STATUS ==========
  router.post('/status', async (req, res) => {
    const { followerId, followingId, item_id } = req.body;
    if (!followerId || !followingId || !item_id) return res.status(400).json({ message: 'Invalid input' });

    try {
      const follow = await Follow.findOne({ follower: followerId, following: followingId, item_id });
      if (!follow) return res.json({ status: null });
      res.json({ status: follow.status, item_id: follow.item_id });
    } catch (err) {
      console.error('Error in /status:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ========== FOLLOWERS ==========
  router.get('/followers/:id/:itemId', async (req, res) => {
    const { id, itemId } = req.params;
    try {
      const followers = await Follow.find({ following: id, item_id: itemId, status: true }).select('follower item_id');
      res.json({ followers });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ========== FOLLOWING ==========
  router.get('/following/:id/:itemId', async (req, res) => {
    const { id, itemId } = req.params;
    try {
      const following = await Follow.find({ follower: id, item_id: itemId, status: true }).select('following item_id');
      res.json({ following });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
}

module.exports = followRouter;
