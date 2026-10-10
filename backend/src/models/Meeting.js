import mongoose from 'mongoose';
import crypto from 'crypto';

const meetingParticipantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['host', 'co-host', 'attendee'],
      default: 'attendee',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
    },
    audioEnabled: {
      type: Boolean,
      default: true,
    },
    videoEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    meetingCode: {
      type: String,
      unique: true,
      index: true,
      default: () => {
        // Generates user-friendly code like 'abc-defg-hij'
        const p1 = crypto.randomBytes(2).toString('hex').slice(0, 3);
        const p2 = crypto.randomBytes(2).toString('hex').slice(0, 4);
        const p3 = crypto.randomBytes(2).toString('hex').slice(0, 3);
        return `${p1}-${p2}-${p3}`;
      },
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
    },
    scheduledStart: {
      type: Date,
      default: Date.now,
    },
    scheduledEnd: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 60 * 1000), // Default 30 min
    },
    actualStart: {
      type: Date,
    },
    actualEnd: {
      type: Date,
    },
    durationMinutes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    passcode: {
      type: String,
      default: '',
    },
    isInstant: {
      type: Boolean,
      default: false,
    },
    participants: [meetingParticipantSchema],
    invitedEmails: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    summary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MeetingSummary',
      default: null,
    },
    transcript: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transcript',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
meetingSchema.index({ host: 1, scheduledStart: -1 });
meetingSchema.index({ workspace: 1, scheduledStart: -1 });
meetingSchema.index({ 'participants.user': 1 });

const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;
