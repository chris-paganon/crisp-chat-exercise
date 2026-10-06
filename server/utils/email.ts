import { BrevoClient } from "@getbrevo/brevo";

interface SendAuthEmailOptions {
  actionLabel: string;
  actionUrl: string;
  body: string;
  preheader: string;
  recipient: {
    email: string;
    name: string;
  };
  subject: string;
  title: string;
}

export async function sendAuthEmail(options: SendAuthEmailOptions) {
  const config = useRuntimeConfig();

  if (!config.brevoApiKey || !config.brevoSenderEmail) {
    throw new Error("Brevo email is not configured. Set NUXT_BREVO_API_KEY and NUXT_BREVO_SENDER_EMAIL.");
  }

  const client = new BrevoClient({
    apiKey: config.brevoApiKey,
  });
  const recipientName = options.recipient.name.trim();
  const greeting = recipientName ? `Hi ${recipientName},` : "Hello,";

  await client.transactionalEmails.sendTransacEmail({
    sender: {
      email: config.brevoSenderEmail,
      name: config.brevoSenderName,
    },
    to: [{
      email: options.recipient.email,
      name: recipientName || undefined,
    }],
    subject: options.subject,
    textContent: `${greeting}\n\n${options.body}\n\n${options.actionLabel}: ${options.actionUrl}\n\nIf you did not request this, you can ignore this email.`,
    htmlContent: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${options.title}</title>
  </head>
  <body style="margin:0;background:#f5f5f5;color:#171717;font-family:Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${options.preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e5e5;">
            <tr>
              <td style="padding:32px;">
                <div style="margin-bottom:28px;font-size:20px;font-weight:700;">Crisp</div>
                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;">${options.title}</h1>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.6;">${greeting}</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">${options.body}</p>
                <a href="${options.actionUrl}" style="display:inline-block;background:#1972f5;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-size:15px;font-weight:600;">${options.actionLabel}</a>
                <p style="margin:28px 0 0;color:#737373;font-size:13px;line-height:1.5;">If you did not request this, you can ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  });
}
