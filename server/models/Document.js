
import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    originalName: {
      type: String,
      required: true
    },

    displayName: {
      type: String,
      default: ""
    },

    storedName: {
      type: String,
      required: true
    },

    mimeType: {
      type: String,
      required: true
    },

    size: {
      type: Number,
      required: true
    },

    category: {
      type: String,
      default: "Other"
    },

    filePath: {
      type: String,
      required: true
    },

    expiryDate: {
      type: Date,
      default: null
    },

    expiryReminderSentFor: {
      type: Date,
      default: null
    },
    expiredAlertSentFor: {
      type: Date,
      default: null
  },

    verificationStatus: {
      type: String,
      enum: ["Verified", "Needs Review", "Expired"],
      default: "Needs Review"
    },

    verificationMessage: {
      type: String,
      default: "Verification pending"
    },

    verifiedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Document = mongoose.model("Document", documentSchema);

export default Document;
