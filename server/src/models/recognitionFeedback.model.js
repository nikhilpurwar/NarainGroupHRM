import mongoose from 'mongoose';

const { Schema } = mongoose;

const recognitionFeedbackSchema = new Schema(
  {
    // The actual employee identified
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    // The employee predicted by the recognition engine (can differ if false match)
    predictedId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
    // Confidence score from the recognition engine (0.0 to 1.0)
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    // Was the prediction correct?
    correct: {
      type: Boolean,
      default: null,
    },
    // Action: 'enrollment', 'recognition', 'confirm-recognition', 'feedback'
    action: {
      type: String,
      enum: ['enrollment', 'recognition', 'confirm-recognition', 'feedback'],
      default: 'feedback',
    },
    // Additional metadata
    userAgent: String,
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: 'recognitionFeedback',
  }
);

// Index for analytics
recognitionFeedbackSchema.index({ employeeId: 1, createdAt: -1 });
recognitionFeedbackSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model('RecognitionFeedback', recognitionFeedbackSchema);
