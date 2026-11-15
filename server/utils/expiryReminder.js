
import cron from "node-cron";
import Document from "../models/Document.js";
import {
  sendExpiryEmail,
  sendExpiredEmail
} from "./emailService.js";

export const checkExpiringDocuments = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextSevenDays = new Date(today);
    nextSevenDays.setDate(nextSevenDays.getDate() + 7);
    nextSevenDays.setHours(23, 59, 59, 999);

    // Find documents that have already expired
    const expiredDocuments = await Document.find({
      expiryDate: { $lt: today }
    }).populate("user", "email");

    for (const doc of expiredDocuments) {
      if (!doc.user || !doc.user.email) continue;

      const expiryKey = new Date(doc.expiryDate)
        .toISOString()
        .slice(0, 10);

      const sentKey = doc.expiredAlertSentFor
        ? new Date(doc.expiredAlertSentFor)
            .toISOString()
            .slice(0, 10)
        : null;

      if (expiryKey === sentKey) continue;

      const formattedDate = new Date(doc.expiryDate)
        .toLocaleDateString("en-IN");

      const sent = await sendExpiredEmail(
        doc.user.email,
        doc.displayName || doc.originalName,
        formattedDate
      );

      if (sent) {
        doc.expiredAlertSentFor = doc.expiryDate;
        await doc.save();
      }
    }

    // Find documents expiring within the next 7 days
    const documents = await Document.find({
      expiryDate: {
        $gte: today,
        $lte: nextSevenDays
      }
    }).populate("user", "email");

    for (const doc of documents) {
      if (!doc.user || !doc.user.email) continue;

      const expiryKey = new Date(doc.expiryDate)
        .toISOString()
        .slice(0, 10);

      const sentKey = doc.expiryReminderSentFor
        ? new Date(doc.expiryReminderSentFor)
            .toISOString()
            .slice(0, 10)
        : null;

      if (expiryKey === sentKey) continue;

      const formattedDate = new Date(doc.expiryDate)
        .toLocaleDateString("en-IN");

      const sent = await sendExpiryEmail(
        doc.user.email,
        doc.displayName || doc.originalName,
        formattedDate
      );

      if (sent) {
        doc.expiryReminderSentFor = doc.expiryDate;
        await doc.save();
      }
    }

    console.log("Expiry reminder and expired alert check completed");
  } catch (error) {
    console.error("Expiry reminder check failed:", error.message);
  }
};

cron.schedule("0 9 * * *", checkExpiringDocuments, {
  timezone: "Asia/Kolkata"
});

console.log("Daily expiry email scheduler started");

checkExpiringDocuments();
