
import nodemailer from "nodemailer";

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

export const sendExpiryEmail = async (email, documentName, expiryDate) => {
  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Warning! Your document is expiring soon",
      html: `
        <h2>DocuSafe Expiry Reminder</h2>
        <p>Your document <b>${documentName}</b> will expire soon.</p>
        <p>Expiry Date: <b>${expiryDate}</b></p>
        <p>Please renew your document before it expires.</p>
      `
    });

    console.log("Expiry email sent to:", email);
    return true;
  } catch (error) {
    console.error("Email sending failed:", error.message);
    return false;
  }
};

export const sendUploadEmail = async (email, documentName) => {
  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Document uploaded successfully - DocuSafe",
      html: `
        <h2>DocuSafe Upload Confirmation</h2>
        <p>Your document <b>${documentName}</b> has been uploaded successfully.</p>
        <p>Your document is now available in your DocuSafe account.</p>
      `
    });

    console.log("Upload confirmation email sent to:", email);
    return true;
  } catch (error) {
    console.error("Upload email failed:", error.message);
    return false;
  }
};

export const sendExpiredEmail = async (email, documentName, expiryDate) => {
  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "ALERT! Your document has expired - DocuSafe",
      html: `
        <h2 style="color: red;">DocuSafe - Document Expired Alert</h2>
        <p>Your document <b>${documentName}</b> has expired.</p>
        <p>Expiry Date: <b>${expiryDate}</b></p>
        <p>Please renew your document as soon as possible.</p>
      `
    });

    console.log("Expired document alert sent to:", email);
    return true;
  } catch (error) {
    console.error("Expired email failed:", error.message);
    return false;
  }
};
