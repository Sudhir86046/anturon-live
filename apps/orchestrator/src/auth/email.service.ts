import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM =
  process.env.EMAIL_FROM || "business@anturon.io";

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:3000";

export async function sendVerificationEmail(
  email: string,
  token: string,
  name: string
) {
  const verificationUrl =
    `${FRONTEND_URL}/verify-email?token=${token}`;

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: email,
    subject: "Verify your Anturon account",
    html: `
      <div style="font-family: Arial, sans-serif; padding:20px;">
        <h2>Welcome to Anturon, ${name} 👋</h2>

        <p>Thank you for creating your Anturon account.</p>

        <p>Please click the button below to verify your email.</p>

        <a href="${verificationUrl}"
           style="
             background:#2563eb;
             color:white;
             padding:12px 24px;
             text-decoration:none;
             border-radius:8px;
             display:inline-block;
             margin-top:20px;
           ">
           Verify Email
        </a>

        <p style="margin-top:30px;">
          If button doesn't work, use this link:
        </p>

        <p>${verificationUrl}</p>

        <hr />

        <p>Team Anturon</p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend Error:", error);
    throw new Error("Failed to send verification email");
  }

  return data;
}