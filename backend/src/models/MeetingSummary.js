import mongoose from 'mongoose';

const meetingSummarySchema = new mongoose.Schema(
  {
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
      unique: true,
      index: true,
    },
    overview: {
      type: String,
      required: true,
    },
    keyTopics: [
      {
        topic: { type: String, required: true },
        summary: { type: String, required: true },
      },
    ],
    decisions: [
      {
        decision: { type: String, required: true },
        context: { type: String, default: '' },
      },
    ],
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'constructive', 'mixed'],
      default: 'constructive',
    },
    keywords: [
      {
        type: String,
      },
    ],
    modelUsed: {
      type: String,
      default: 'gpt-4o-mini',
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const MeetingSummary = mongoose.model('MeetingSummary', meetingSummarySchema);
export default MeetingSummary;
