import mongoose from 'mongoose';

const transcriptSegmentSchema = new mongoose.Schema(
  {
    speaker: {
      type: String,
      default: 'Speaker',
    },
    speakerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    text: {
      type: String,
      required: true,
    },
    startTime: {
      type: Number,
      default: 0,
    },
    endTime: {
      type: Number,
      default: 0,
    },
    confidence: {
      type: Number,
      default: 1.0,
    },
  },
  { _id: true }
);

const transcriptSchema = new mongoose.Schema(
  {
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
      unique: true,
      index: true,
    },
    rawText: {
      type: String,
      required: [true, 'Transcript content is required'],
    },
    segments: [transcriptSegmentSchema],
    source: {
      type: String,
      enum: ['live_captions', 'audio_upload', 'manual_submission'],
      default: 'manual_submission',
    },
    processedByAI: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      default: 'en',
    },
    wordCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

transcriptSchema.pre('save', function (next) {
  if (this.rawText) {
    this.wordCount = this.rawText.trim().split(/\s+/).filter(Boolean).length;
  }
  next();
});

const Transcript = mongoose.model('Transcript', transcriptSchema);
export default Transcript;
