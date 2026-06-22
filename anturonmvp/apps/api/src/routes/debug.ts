import { Router } from 'express';

const router = Router();

// Store last 10 emails in memory (for dev only)
export const emailLog: Array<{
  to: string;
  subject: string;
  html: string;
  timestamp: string;
}> = [];

export function addEmailToLog(email: { to: string; subject: string; html: string }) {
  emailLog.unshift({
    ...email,
    timestamp: new Date().toISOString(),
  });
  if (emailLog.length > 10) emailLog.pop();
}

// Debug endpoint to see emails
router.get('/emails', (req, res) => {
  res.json({
    message: 'Recent emails (development mode - no actual emails sent)',
    emails: emailLog,
  });
});

// Debug endpoint to verify email manually
router.post('/verify-email', (req, res) => {
  const { email } = req.body;
  
  const foundEmail = emailLog.find(e => e.to === email);
  if (!foundEmail) {
    return res.status(404).json({ 
      error: 'No email found for this address',
      availableEmails: emailLog.map(e => e.to)
    });
  }
  
  // Extract verification link from HTML
  const verifyLinkMatch = foundEmail.html.match(/href="([^"]*verify[^"]*)"/);
  const verifyLink = verifyLinkMatch ? verifyLinkMatch[1] : null;
  
  res.json({
    found: true,
    to: foundEmail.to,
    subject: foundEmail.subject,
    timestamp: foundEmail.timestamp,
    verifyLink,
    html: foundEmail.html,
  });
});

export default router;
