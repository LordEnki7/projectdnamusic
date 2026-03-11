import { Resend } from 'resend';

let connectionSettings: any;

function getAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
  if (replitDomain) return `https://${replitDomain}`;
  return 'https://projectdnamusic.info';
}

async function getCredentials() {
  if (process.env.RESEND_API_KEY) {
    return {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@projectdnamusic.info',
    };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Email not configured. Set RESEND_API_KEY environment variable.');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email};
}

async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail
  };
}

export interface OrderItem {
  title: string;
  itemType: string;
  price: number;
  quantity: number;
  audioUrl: string | null;
  size: string | null;
}

export async function sendOrderConfirmationEmail(
  customerEmail: string,
  customerName: string,
  orderId: string,
  orderItems: OrderItem[],
  subtotal: number,
  tax: number,
  shippingCost: number,
  total: number
) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const appUrl = getAppUrl();
    
    const digitalItems = orderItems.filter(item => 
      (item.itemType === 'song' || item.itemType === 'beat') && item.audioUrl
    );
    const merchItems = orderItems.filter(item => item.itemType === 'merch');
    
    const itemsListHtml = orderItems.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #333;">
          ${item.title}
          ${item.size ? ` (Size: ${item.size})` : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #333; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #333; text-align: right;">
          $${item.price.toFixed(2)}
        </td>
      </tr>
    `).join('');
    
    const downloadLinksHtml = digitalItems.length > 0 ? `
      <div style="margin-top: 32px; padding: 24px; background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); border-radius: 8px;">
        <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 20px;">Your Downloads</h2>
        <p style="color: #e0e7ff; margin: 0 0 16px 0;">
          Click the links below to download your purchased music:
        </p>
        ${digitalItems.map(item => `
          <div style="margin-bottom: 12px;">
            <a href="${item.audioUrl}" 
               style="display: inline-block; padding: 12px 24px; background: #ffffff; color: #7c3aed; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Download: ${item.title}
            </a>
          </div>
        `).join('')}
        <p style="color: #e0e7ff; margin: 16px 0 0 0; font-size: 14px;">
          Tip: You can also access your downloads anytime from your <a href="${appUrl}/orders" style="color: #ffffff; text-decoration: underline;">Order History</a>
        </p>
      </div>
    ` : '';
    
    const merchNoticeHtml = merchItems.length > 0 ? `
      <div style="margin-top: 24px; padding: 16px; background: #1a1a2e; border-left: 4px solid #7c3aed; border-radius: 4px;">
        <p style="color: #a78bfa; margin: 0; font-weight: 600;">Your merchandise will be shipped soon!</p>
        <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 14px;">
          You'll receive a tracking number via email once your order ships.
        </p>
      </div>
    ` : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0f; color: #ffffff;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-family: 'Orbitron', monospace; font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0;">
                PROJECT DNA MUSIC LLC
              </h1>
              <p style="color: #9ca3af; margin: 8px 0 0 0;">Energy &bull; Light &bull; Love Through Sound</p>
            </div>
            
            <!-- Success Message -->
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #333;">
              <div style="text-align: center; margin-bottom: 16px;">
                <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
              <h2 style="color: #ffffff; text-align: center; margin: 0 0 8px 0; font-size: 24px;">Order Confirmed!</h2>
              <p style="color: #9ca3af; text-align: center; margin: 0;">
                Thank you for your purchase, ${customerName}!
              </p>
            </div>
            
            ${downloadLinksHtml}
            
            <!-- Order Details -->
            <div style="background: #1a1a2e; padding: 24px; border-radius: 8px; margin-top: 24px; border: 1px solid #333;">
              <h3 style="color: #ffffff; margin: 0 0 16px 0; font-size: 18px;">Order Details</h3>
              <p style="color: #9ca3af; margin: 0 0 16px 0; font-size: 14px;">
                Order ID: <span style="color: #a78bfa; font-family: monospace;">#${orderId}</span>
              </p>
              
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #7c3aed;">
                    <th style="padding: 12px; text-align: left; color: #a78bfa; font-weight: 600;">Item</th>
                    <th style="padding: 12px; text-align: center; color: #a78bfa; font-weight: 600;">Qty</th>
                    <th style="padding: 12px; text-align: right; color: #a78bfa; font-weight: 600;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsListHtml}
                </tbody>
              </table>
              
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #333;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #9ca3af;">Subtotal:</span>
                  <span style="color: #ffffff;">$${subtotal.toFixed(2)}</span>
                </div>
                ${shippingCost > 0 ? `
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #9ca3af;">Shipping:</span>
                    <span style="color: #ffffff;">$${shippingCost.toFixed(2)}</span>
                  </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #9ca3af;">Tax:</span>
                  <span style="color: #ffffff;">$${tax.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #7c3aed; margin-top: 8px;">
                  <span style="color: #ffffff; font-weight: 700; font-size: 18px;">Total:</span>
                  <span style="color: #7c3aed; font-weight: 700; font-size: 18px;">$${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            ${merchNoticeHtml}
            
            <!-- Footer -->
            <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #333; text-align: center;">
              <p style="color: #9ca3af; margin: 0 0 16px 0; font-size: 14px;">
                Questions? Contact us at <a href="mailto:support@projectdnamusic.info" style="color: #7c3aed; text-decoration: none;">support@projectdnamusic.info</a>
              </p>
              <p style="color: #6b7280; margin: 0; font-size: 12px;">
                &copy; ${new Date().getFullYear()} Project DNA Music LLC. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await client.emails.send({
      from: fromEmail,
      to: customerEmail,
      subject: `Order Confirmed - Project DNA Music LLC #${orderId}`,
      html: htmlContent,
    });

    console.log('✅ Order confirmation email sent:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending order confirmation email:', error);
    throw error;
  }
}

export async function sendProductionInquiryNotification(
  customerName: string,
  customerEmail: string,
  subject: string,
  message: string,
  ownerEmail: string = 'support@projectdnamusic.info'
) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0f; color: #ffffff;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-family: 'Orbitron', monospace; font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0;">
                PROJECT DNA MUSIC LLC
              </h1>
              <p style="color: #9ca3af; margin: 8px 0 0 0;">New Production Service Inquiry</p>
            </div>
            
            <!-- Alert Box -->
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); padding: 24px; border-radius: 8px; margin-bottom: 24px;">
              <h2 style="color: #ffffff; margin: 0 0 8px 0; font-size: 20px;">New Client Inquiry</h2>
              <p style="color: #e0e7ff; margin: 0;">
                You have a new production service request from a potential client.
              </p>
            </div>
            
            <!-- Client Details -->
            <div style="background: #1a1a2e; padding: 24px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #333;">
              <h3 style="color: #ffffff; margin: 0 0 16px 0; font-size: 18px;">Client Information</h3>
              
              <div style="margin-bottom: 12px;">
                <span style="color: #a78bfa; font-weight: 600;">Name:</span>
                <span style="color: #ffffff; margin-left: 8px;">${customerName}</span>
              </div>
              
              <div style="margin-bottom: 12px;">
                <span style="color: #a78bfa; font-weight: 600;">Email:</span>
                <a href="mailto:${customerEmail}" style="color: #7c3aed; margin-left: 8px; text-decoration: none;">${customerEmail}</a>
              </div>
              
              <div style="margin-bottom: 12px;">
                <span style="color: #a78bfa; font-weight: 600;">Subject:</span>
                <span style="color: #ffffff; margin-left: 8px;">${subject}</span>
              </div>
            </div>
            
            <!-- Message -->
            <div style="background: #1a1a2e; padding: 24px; border-radius: 8px; border: 1px solid #333;">
              <h3 style="color: #ffffff; margin: 0 0 16px 0; font-size: 18px;">Message</h3>
              <div style="color: #e5e7eb; line-height: 1.6; white-space: pre-wrap;">${message}</div>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin-top: 32px;">
              <a href="mailto:${customerEmail}?subject=Re: ${encodeURIComponent(subject)}" 
                 style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Reply to Client
              </a>
            </div>
            
            <!-- Footer -->
            <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #333; text-align: center;">
              <p style="color: #6b7280; margin: 0; font-size: 12px;">
                This is an automated notification from your Project DNA Music website.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await client.emails.send({
      from: fromEmail,
      to: ownerEmail,
      replyTo: customerEmail,
      subject: `New Production Inquiry: ${subject}`,
      html: htmlContent,
    });

    console.log('✅ Production inquiry notification sent to owner:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending production inquiry notification:', error);
    throw error;
  }
}

export async function sendProductionInquiryConfirmation(
  customerName: string,
  customerEmail: string,
  subject: string
) {
  try {
    const { client, fromEmail } = await getUncachableResendClient();
    const appUrl = getAppUrl();
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0f; color: #ffffff;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-family: 'Orbitron', monospace; font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0;">
                PROJECT DNA MUSIC LLC
              </h1>
              <p style="color: #9ca3af; margin: 8px 0 0 0;">Energy &bull; Light &bull; Love Through Sound</p>
            </div>
            
            <!-- Success Message -->
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #333;">
              <div style="text-align: center; margin-bottom: 16px;">
                <div style="display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
              <h2 style="color: #ffffff; text-align: center; margin: 0 0 8px 0; font-size: 24px;">Message Received!</h2>
              <p style="color: #9ca3af; text-align: center; margin: 0;">
                Thank you for reaching out, ${customerName}!
              </p>
            </div>
            
            <!-- Confirmation Details -->
            <div style="background: #1a1a2e; padding: 24px; border-radius: 8px; border: 1px solid #333;">
              <p style="color: #e5e7eb; line-height: 1.6; margin: 0 0 16px 0;">
                We've received your inquiry about <strong style="color: #a78bfa;">${subject}</strong> and we're excited to work with you!
              </p>
              <p style="color: #e5e7eb; line-height: 1.6; margin: 0 0 16px 0;">
                Our team will review your message and get back to you within 24-48 hours via email at <span style="color: #7c3aed; font-family: monospace;">${customerEmail}</span>.
              </p>
              <p style="color: #e5e7eb; line-height: 1.6; margin: 0;">
                In the meantime, feel free to explore our catalog and check out what we've been working on!
              </p>
            </div>
            
            <!-- Action Buttons -->
            <div style="margin-top: 24px; text-align: center;">
              <a href="${appUrl}/music" 
                 style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 8px;">
                Browse Music
              </a>
              <a href="${appUrl}/producer" 
                 style="display: inline-block; padding: 14px 32px; background: #1a1a2e; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; border: 1px solid #7c3aed; margin: 8px;">
                Learn More
              </a>
            </div>
            
            <!-- Footer -->
            <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #333; text-align: center;">
              <p style="color: #9ca3af; margin: 0 0 16px 0; font-size: 14px;">
                Questions? Contact us at <a href="mailto:support@projectdnamusic.info" style="color: #7c3aed; text-decoration: none;">support@projectdnamusic.info</a>
              </p>
              <p style="color: #6b7280; margin: 0; font-size: 12px;">
                &copy; ${new Date().getFullYear()} Project DNA Music LLC. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await client.emails.send({
      from: fromEmail,
      to: customerEmail,
      subject: `We received your inquiry - Project DNA Music LLC`,
      html: htmlContent,
    });

    console.log('✅ Production inquiry confirmation sent to customer:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending production inquiry confirmation:', error);
    throw error;
  }
}
