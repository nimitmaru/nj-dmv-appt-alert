import { Resend } from 'resend';
import type { Appointment } from './types';

export class Notifier {
  private resend: Resend;
  private fromEmail = 'NJ DMV Monitor <onboarding@resend.dev>'; // Default Resend email
  private toEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.NOTIFICATION_EMAIL;

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    if (!toEmail) {
      throw new Error('NOTIFICATION_EMAIL is not configured');
    }

    this.resend = new Resend(apiKey);
    this.toEmail = toEmail;
  }

  async sendNotification(appointments: Appointment[]): Promise<void> {
    const subject = `🚨 NJ DMV Weekend Appointments Available - ${appointments.length} location(s)`;
    const html = this.generateHTMLEmail(appointments);
    const text = this.generateTextEmail(appointments);

    try {
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to: this.toEmail,
        subject,
        html,
        text,
      });

      console.log('Email sent successfully:', response);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  private generateHTMLEmail(appointments: Appointment[]): string {
    const appointmentBlocks = appointments.map(appt => `
      <div style="background-color: #f9fafb; padding: 20px; margin-bottom: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
        <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px;">📍 ${appt.location}</h3>
        <p style="margin: 5px 0; color: #4b5563;">
          <strong>Date:</strong> ${appt.date} (${appt.dayOfWeek})
        </p>
        <p style="margin: 5px 0; color: #4b5563;">
          <strong>Available Times:</strong> ${appt.times.slice(0, 5).join(', ')}${appt.times.length > 5 ? ` + ${appt.times.length - 5} more` : ''}
        </p>
        <a href="${appt.url}" style="display: inline-block; margin-top: 10px; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; font-weight: 500;">
          Book Appointment →
        </a>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🚨 DMV Weekend Appointments Available!</h1>
        </div>
        
        <div style="background-color: white; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #4b5563; margin-bottom: 20px;">
            Great news! Weekend appointments have become available at the following NJ DMV locations for <strong>Transfer from out of state</strong>:
          </p>
          
          ${appointmentBlocks}
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>⚡ Act fast!</strong> These appointments typically get booked within minutes.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            This notification was sent by your NJ DMV Appointment Monitor.<br>
            Checking locations every 5 minutes.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private generateTextEmail(appointments: Appointment[]): string {
    let text = '🚨 NJ DMV Weekend Appointments Available!\n\n';
    text += `Found appointments at ${appointments.length} location(s) for Transfer from out of state:\n\n`;

    for (const appt of appointments) {
      text += `📍 ${appt.location}\n`;
      text += `   Date: ${appt.date} (${appt.dayOfWeek})\n`;
      text += `   Times: ${appt.times.slice(0, 5).join(', ')}${appt.times.length > 5 ? ` + ${appt.times.length - 5} more` : ''}\n`;
      text += `   Book at: ${appt.url}\n\n`;
    }

    text += '\n⚡ Act fast! These appointments typically get booked within minutes.\n';
    text += '\n---\nNJ DMV Appointment Monitor - Checking every 5 minutes';

    return text;
  }
}