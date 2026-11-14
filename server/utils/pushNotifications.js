
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const webpush = require("web-push");

const configurePush = () => {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
};

export const getPublicKey = () => {
  return process.env.VAPID_PUBLIC_KEY;
};

export const sendPushNotification = async (
  subscription,
  payload
) => {
  try {
    configurePush();

    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );

    return true;
  } catch (error) {
    console.error("Push notification error:", error.message);
    return false;
  }
};
