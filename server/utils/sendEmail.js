
import nodemailer from "nodemailer";

export default async function sendEmail(to, otp) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"DocuSafe" <${process.env.EMAIL_USER}>`,
    to,
    subject: "DocuSafe Email Verification",
    html: `
      <h2>Welcome to DocuSafe!</h2>
      <p>Your email verification code is:</p>
      <h1>${otp}</h1>
      <p>This code expires in 5 minutes.</p>
      <p>Please do not share this code with anyone.</p>
    `,
  });
}
