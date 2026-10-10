import Notification from '../models/Notification.js';

class NotificationService {
  /**
   * Create and optionally push real-time notification
   */
  async createNotification({ recipientId, senderId = null, title, message, type = 'system', link = '', metadata = {}, io = null }) {
    try {
      const notification = await Notification.create({
        recipient: recipientId,
        sender: senderId,
        title,
        message,
        type,
        link,
        metadata,
      });

      if (io) {
        // Emit to user's private notification socket room
        io.to(`user:${recipientId}`).emit('notification:new', {
          notification,
        });
      }

      return notification;
    } catch (error) {
      console.error('[NotificationService Error]', error.message);
      return null;
    }
  }

  /**
   * Broadcast meeting invite to multiple users
   */
  async notifyMeetingInvite({ recipients, senderId, meetingTitle, meetingId, io }) {
    const promises = recipients.map((recipientId) =>
      this.createNotification({
        recipientId,
        senderId,
        title: 'Meeting Invitation',
        message: `You were invited to "${meetingTitle}"`,
        type: 'meeting_invite',
        link: `/meetings/${meetingId}`,
        metadata: { meetingId },
        io,
      })
    );
    return Promise.all(promises);
  }

  /**
   * Notify user of assigned action item
   */
  async notifyActionItemAssigned({ recipientId, senderId, taskTitle, meetingTitle, meetingId, actionItemId, io }) {
    return this.createNotification({
      recipientId,
      senderId,
      title: 'New Action Item Assigned',
      message: `You were assigned "${taskTitle}" from "${meetingTitle}"`,
      type: 'action_item_assigned',
      link: `/action-items`,
      metadata: { meetingId, actionItemId },
      io,
    });
  }
}

export default new NotificationService();
