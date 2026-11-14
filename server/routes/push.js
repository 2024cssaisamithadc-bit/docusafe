import express from "express";
import auth from "../middleware/auth.js";
import PushSubscription from "../models/PushSubscription.js";
import {
  sendPushNotification
} from "../utils/pushNotifications.js";

const router = express.Router();

router.get("/public-key", auth, (req, res) => {
  res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY
  });
});

router.post("/subscribe", auth, async (req, res) => {
  try {
    const subscription = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        message: "Invalid push subscription."
      });
    }

    await PushSubscription.findOneAndUpdate(
      {
        user: req.userId,
        endpoint: subscription.endpoint
      },
      {
        user: req.userId,
        endpoint: subscription.endpoint,
        subscription
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    res.status(201).json({
      message: "Phone registered successfully."
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Unable to register phone."
    });
  }
});

router.post("/test", auth, async (req, res) => {
  try {
    const subscriptions = await PushSubscription.find({
      user: req.userId
    });

    if (subscriptions.length === 0) {
      return res.status(404).json({
        message: "No registered devices found. Enable notifications first."
      });
    }

    let successCount = 0;

    for (const item of subscriptions) {
      const success = await sendPushNotification(
        item.subscription,
        {
          title: "DocuSafe Test Notification",
          body: "Congratulations! Your DocuSafe notifications are working.",
          url: "/"
        }
      );

      if (success) {
        successCount++;
      }
    }

    if (successCount === 0) {
      return res.status(500).json({
        message: "Unable to send notification. Please check your subscription."
      });
    }

    res.json({
      message: `Test notification sent to ${successCount} device(s).`
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to send test notification."
    });
  }
});

router.delete("/unsubscribe", auth, async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        message: "Subscription endpoint is required."
      });
    }

    await PushSubscription.findOneAndDelete({
      user: req.userId,
      endpoint
    });

    res.json({
      message: "Subscription removed."
    });
  } catch (error) {
    res.status(500).json({
      message: "Unable to remove subscription."
    });
  }
});

export default router;
