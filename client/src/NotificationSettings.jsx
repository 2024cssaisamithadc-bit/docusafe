import { useState } from "react";

const API_URL = "http://localhost:5000/api/push";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat(
    (4 - (base64String.length % 4)) % 4
  );

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((char) => char.charCodeAt(0))
  );
}

export default function NotificationSettings() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const getToken = () => localStorage.getItem("token");

  const enableNotifications = async () => {
    try {
      setLoading(true);
      setMessage("");

      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        throw new Error(
          "Push notifications are not supported."
        );
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error("Notification permission denied.");
      }

      const token = getToken();

      if (!token) {
        throw new Error("Please log in first.");
      }

      const registration =
        await navigator.serviceWorker.register("/sw.js");

      const keyResponse = await fetch(
        `${API_URL}/public-key`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const keyData = await keyResponse.json();

      if (!keyResponse.ok || !keyData.publicKey) {
        throw new Error("Unable to get public key.");
      }

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription =
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              keyData.publicKey
            )
          });
      }

      const response = await fetch(
        `${API_URL}/subscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(subscription)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setMessage("Notifications enabled successfully!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      setLoading(true);
      setMessage("");

      const token = getToken();

      const response = await fetch(
        `${API_URL}/test`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h3>Phone Notifications 🔔</h3>

      <p>
        Receive document expiry reminders on your phone.
      </p>

      <button
        onClick={enableNotifications}
        disabled={loading}
      >
        Enable Notifications
      </button>

      <button
        onClick={sendTestNotification}
        disabled={loading}
      >
        Send Test Notification
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}
