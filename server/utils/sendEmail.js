
export default async function sendEmail(to, otp) {
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
        to: [{ email: to }],
        subject: "DocuSafe Email Verification",
        htmlContent: `
          <h2>Welcome to DocuSafe!</h2>
          <p>Your email verification code is:</p>
          <h1>${otp}</h1>
          <p>This code expires in 5 minutes.</p>
          <p>Please do not share this code with anyone.</p>
        `
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    console.log("OTP email sent successfully to:", to);
  } catch (error) {
    console.error("OTP email sending failed:", error.message);
    throw error;
  }
}
