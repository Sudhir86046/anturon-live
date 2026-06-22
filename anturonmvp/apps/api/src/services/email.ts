import { Resend } from 'resend';
import { addEmailToLog } from '../routes/debug.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@anturon.io';
const APP_URL = process.env.APP_URL || 'http://localhost:3005';

// Initialize Resend only if API key is available
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(data: EmailData): Promise<{ success: boolean; error?: string }> {
  // If no Resend API key, log to console and debug endpoint for development
  if (!resend) {
    console.log('📧 Email would be sent (no RESEND_API_KEY configured):');
    console.log(`To: ${data.to}`);
    console.log(`Subject: ${data.subject}`);
    console.log(`HTML Preview: ${data.html.substring(0, 200)}...`);
    console.log(`View all emails at: http://localhost:3001/debug/emails`);
    
    // Store for debug endpoint
    addEmailToLog(data);
    
    return { success: true };
  }

  try {
    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    console.log(`📧 Email sent to ${data.to}, ID: ${result?.id}`);
    return { success: true };
  } catch (error) {
    console.error('Email exception:', error);
    return { success: false, error: String(error) };
  }
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string,
  organizationSlug: string
): Promise<void> {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}&org=${organizationSlug}`;
  
  await sendEmail({
    to: email,
    subject: 'Verify your email - Anturon Voice AI',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6366f1;">Welcome to Anturon Voice AI!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for signing up. Please verify your email address to activate your account and start using AI voice agents for your business.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" 
                 style="background-color: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6366f1;">${verifyUrl}</p>
            <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              If you didn't create an account, you can safely ignore this email.<br>
              Anturon Voice AI - AI-powered voice agents for businesses in UAE & India
            </p>
          </div>
        </body>
      </html>
    `,
    text: `Welcome to Anturon Voice AI!\n\nHi ${name},\n\nPlease verify your email by clicking this link: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  });
}

export async function sendInvitationEmail(
  email: string,
  invitedByName: string,
  organizationName: string,
  tempPassword: string,
  loginUrl: string
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `You've been invited to join ${organizationName} on Anturon`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6366f1;">You're Invited!</h2>
            <p>Hi there,</p>
            <p><strong>${invitedByName}</strong> has invited you to join <strong>${organizationName}</strong> on Anturon Voice AI.</p>
            <p>Your temporary password: <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="background-color: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  organizationSlug: string
): Promise<void> {
  const dashboardUrl = `${APP_URL}/${organizationSlug}/dashboard`;
  
  await sendEmail({
    to: email,
    subject: 'Welcome to Anturon - Your AI Voice Agents are Ready',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6366f1;">🎉 Welcome to Anturon!</h2>
            <p>Hi ${name},</p>
            <p>Your account is now verified and ready to use. Here's what you can do next:</p>
            <ul>
              <li>Create your first AI voice agent</li>
              <li>Choose from industry templates (Retail, Real Estate, Fintech, Banking, E-commerce)</li>
              <li>Configure your agent's language (English, Arabic, Hindi supported)</li>
              <li>Test with mock calls before going live</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" 
                 style="background-color: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Go to Dashboard
              </a>
            </div>
            <p>Need help? Reply to this email or contact our support team.</p>
            <p style="color: #666; font-size: 12px;">
              Best regards,<br>
              The Anturon Team<br>
              Dubai, UAE | Bangalore, India
            </p>
          </div>
        </body>
      </html>
    `,
  });
}
