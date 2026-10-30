import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    senderName: {
      type: String,
      default: 'Participant',
      trim: true,
    },
    text: {
      type: String,
      required: [true, 'Message text cannot be empty'],
      trim: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: ['chat', 'system', 'file'],
      default: 'chat',
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ meeting: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
