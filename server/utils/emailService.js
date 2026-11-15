
const sendBrevoEmail = async (email, subject, htmlContent) => {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        sender: {
          name: "DocuSafe",
          email: process.env.EMAIL_USER
        },
        to: [{ email }],
        subject,
        htmlContent
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    console.log("Email sent successfully to:", email);
    return true;
  } catch (error) {
    console.error("Email sending failed:", error.message);
    return false;
  }
};

export const sendExpiryEmail = async (email, documentName, expiryDate) => {
  return sendBrevoEmail(
    email,
    "Warning! Your document is expiring soon",
    `
      <h2>DocuSafe Expiry Reminder</h2>
      <p>Your document <b>${documentName}</b> will expire soon.</p>
      <p>Expiry Date: <b>${expiryDate}</b></p>
      <p>Please renew your document before it expires.</p>
    `
  );
};

export const sendUploadEmail = async (email, documentName) => {
  return sendBrevoEmail(
    email,
    "Document uploaded successfully - DocuSafe",
    `
      <h2>DocuSafe Upload Confirmation</h2>
      <p>Your document <b>${documentName}</b> has been uploaded successfully.</p>
      <p>Your document is now available in your DocuSafe account.</p>
    `
  );
};

export const sendExpiredEmail = async (email, documentName, expiryDate) => {
  return sendBrevoEmail(
    email,
    "ALERT! Your document has expired - DocuSafe",
    `
      <h2 style="color: red;">DocuSafe - Document Expired Alert</h2>
      <p>Your document <b>${documentName}</b> has expired.</p>
      <p>Expiry Date: <b>${expiryDate}</b></p>
      <p>Please renew your document as soon as possible.</p>
    `
  );
};
