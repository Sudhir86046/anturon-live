import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');
const FROM = process.env.RESEND_FROM || 'Anturon <onboarding@resend.dev>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:24px 40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <table cellpadding="0" cellspacing="0" border="0" style="background:#E85D04;border-radius:8px;width:36px;height:36px;">
                      <tr>
                        <td align="center" valign="middle" width="36" height="36">
                          <img src="https://raw.githubusercontent.com/microsoft/fluentui-system-icons/main/assets/Flash/SVG/ic_fluent_flash_20_filled.svg" width="0" height="0" alt="" style="display:none;" />
                          <span style="color:#ffffff;font-size:20px;font-weight:700;line-height:1;">&#9889;</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="color:#ffffff;font-size:22px;font-weight:600;letter-spacing:-0.3px;">anturon</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f1f5f9;padding:20px 40px;text-align:center;font-size:12px;color:#94a3b8;">
              &copy; 2025 Anturon &mdash; Enterprise-grade Voice AI Platform<br/>
              This email was sent automatically. Please do not reply.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export async function sendPasswordResetEmail(to: string, name: string, resetToken: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

  const html = baseTemplate(`
    <p style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 12px;">Reset your password</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 8px;">Hi ${name},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 28px;">We received a request to reset your Anturon password. Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
    <a href="${resetUrl}" style="display:inline-block;background:#E85D04;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">Reset Password</a>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0;"><tr><td style="border-top:1px solid #e2e8f0;"></td></tr></table>
    <p style="font-size:13px;color:#94a3b8;line-height:1.5;margin:0;">If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your Anturon password',
    replyTo: 'noreply@resend.dev',
    html,
  });
}

export async function sendVerificationEmail(to: string, name: string, verifyToken: string) {
  const verifyUrl = `${APP_URL}/verify-email?token=${verifyToken}`;

  const html = baseTemplate(`
    <p style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 12px;">Verify your email address</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 8px;">Hi ${name},</p>
    <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 28px;">Welcome to Anturon! Please verify your email address to activate your account and access your dashboard.</p>
    <a href="${verifyUrl}" style="display:inline-block;background:#E85D04;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">Verify Email Address</a>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0;"><tr><td style="border-top:1px solid #e2e8f0;"></td></tr></table>
    <p style="font-size:13px;color:#94a3b8;line-height:1.5;margin:0;">This link expires in <strong>24 hours</strong>. If you didn't create an Anturon account, you can safely ignore this email.</p>
  `);

  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Verify your Anturon email address',
    replyTo: 'noreply@resend.dev',
    html,
  });
}
