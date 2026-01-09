import { Resend } from 'resend';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get data from request
  const { email, inviteLink } = req.body;

  if (!email || !inviteLink) {
    return res.status(400).json({ error: 'Missing email or invite link' });
  }

  try {
    // Initialize Resend with API key from environment variable
    const resend = new Resend(process.env.VITE_RESEND_API_KEY);

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'Queerio House Hub <onboarding@resend.dev>',
      to: email,
      subject: 'You\'re invited to Queerio House Hub! 🏠',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #9333ea;">Welcome to Queerio House Hub!</h1>
          <p style="font-size: 16px; line-height: 1.5;">You've been invited to join the household management app for Elle, Ember, Eva & Illari's home.</p>
          <p style="font-size: 16px; line-height: 1.5;">Click the button below to create your account:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteLink}" style="display: inline-block; padding: 14px 28px; background-color: #9333ea; color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">Create Account</a>
          </div>
          <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
          <p style="font-size: 14px; color: #9333ea; word-break: break-all;">${inviteLink}</p>
          <hr style="margin: 32px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #999;">See you soon! 🌈</p>
        </div>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}