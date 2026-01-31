import { Resend } from 'resend';
import config from '../config.js';

// Only initialize Resend if API key is configured
const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

export async function sendLaneReadyEmail(to, customerName, laneName, rangeName) {
  // Skip if no API key configured
  if (!resend) {
    console.log(`[Email Skipped] No API key. Would send to: ${to}`);
    return { success: false, reason: 'No API key configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'QDog <onboarding@resend.dev>', // Use Resend's test domain
      to: [to],
      subject: `${rangeName} - Your Lane is Ready!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Your Lane is Ready!</h1>
          <p>Hi ${customerName},</p>
          <p>Great news! <strong>${laneName}</strong> is now available for you at ${rangeName}.</p>
          <p style="font-size: 18px; background: #f3f4f6; padding: 15px; border-radius: 8px;">
            Please check in at the front desk within <strong>5 minutes</strong>.
          </p>
          <p>If you don't check in, your spot will be given to the next person in line.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This is an automated message from ${rangeName} queue system.
          </p>
        </div>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error };
    }

    console.log(`Email sent to ${to}: ${data.id}`);
    return { success: true, id: data.id };
  } catch (err) {
    console.error('Failed to send email:', err);
    return { success: false, error: err.message };
  }
}

export async function sendQueueConfirmationEmail(to, customerName, position, rangeName) {
  if (!resend) {
    console.log(`[Email Skipped] No API key. Would send to: ${to}`);
    return { success: false, reason: 'No API key configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'QDog <onboarding@resend.dev>',
      to: [to],
      subject: `${rangeName} - You're in the Queue!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">You're in Line!</h1>
          <p>Hi ${customerName},</p>
          <p>You've been added to the queue at ${rangeName}.</p>
          <p style="font-size: 24px; background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center;">
            Your position: <strong>#${position}</strong>
          </p>
          <p>We'll send you another email when your lane is ready. Keep an eye on your inbox!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This is an automated message from ${rangeName} queue system.
          </p>
        </div>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error };
    }

    console.log(`Confirmation email sent to ${to}: ${data.id}`);
    return { success: true, id: data.id };
  } catch (err) {
    console.error('Failed to send email:', err);
    return { success: false, error: err.message };
  }
}
