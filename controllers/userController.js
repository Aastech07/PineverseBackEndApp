import Follow from '../models/User.js';

// Helper: Ensure user exists (creates if not found)
const ensureUserExists = async (userId) => {
  let user = await Follow.findOne({ userId });
  if (!user) {
    user = await Follow.create({ userId });
  }
  return user;
};

// 1. Send Follow Request
export const requestFollow = async (req, res) => {
  try {
    const { senderId } = req.body;
    const { receiverId } = req.params;

    if (senderId === receiverId) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    await ensureUserExists(senderId);
    const receiver = await ensureUserExists(receiverId);

    if (!receiver.followRequests.includes(senderId)) {
      receiver.followRequests.push(senderId);
      await receiver.save();
    }

    res.status(200).json({ message: 'Follow request sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Accept Follow Request
export const acceptFollow = async (req, res) => {
  try {
    const { followingId } = req.body;
    const { followerId } = req.params;

    const followingUser = await ensureUserExists(followingId);
    const followerUser = await ensureUserExists(followerId);

    // Remove from followRequests
    followingUser.followRequests = followingUser.followRequests.filter(id => id !== followerId);

    // Add to followers/following (no duplicates)
    if (!followingUser.followers.includes(followerId)) {
      followingUser.followers.push(followerId);
    }
    if (!followerUser.following.includes(followingId)) {
      followerUser.following.push(followingId);
    }

    await followingUser.save();
    await followerUser.save();

    res.status(200).json({ message: 'Follow request accepted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Reject Follow Request
export const rejectFollow = async (req, res) => {
  try {
    const { senderId } = req.body;
    const receiver = await ensureUserExists(req.params.receiverId);

    receiver.followRequests = receiver.followRequests.filter(id => id !== senderId);
    await receiver.save();

    res.status(200).json({ message: 'Follow request rejected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Check if "Follow" button should be shown
export const shouldShowFollow = async (req, res) => {
  try {
    const { profileUserId, currentUserId } = req.params;
    const profileUser = await ensureUserExists(profileUserId);

    const isFollowing = profileUser.followers.includes(currentUserId);
    const isRequested = profileUser.followRequests.includes(currentUserId);

    const shouldShowFollow = !isFollowing && !isRequested;

    res.status(200).json({ shouldShowFollow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};