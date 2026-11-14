
import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    subscription: {
      type: Object,
      required: true
    },

    endpoint: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

pushSubscriptionSchema.index(
  { user: 1, endpoint: 1 },
  { unique: true }
);

const PushSubscription = mongoose.model(
  "PushSubscription",
  pushSubscriptionSchema
);

export default PushSubscription;
