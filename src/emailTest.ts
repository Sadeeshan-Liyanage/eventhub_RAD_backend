import { env } from "./config/env";
import { emailEnabled, sendEmail } from "./services/email.service";

const to = process.argv[2];

const run = async () => {
  if (!to) throw new Error("Usage: npm run email:test your-address@example.com");
  if (!emailEnabled()) throw new Error("SMTP_HOST is empty in .env, so emails are switched off.");
  await sendEmail({
    to,
    subject: "EventHub test email",
    text: "If you can read this, your EventHub email settings work.",
    html: "<p>If you can read this, your <strong>EventHub</strong> email settings work.</p>",
  });
  console.log(`Test email sent to ${to} using ${env.smtpHost}:${env.smtpPort}. Check the inbox (and spam folder).`);
};

run().catch((e) => {
  console.error("Could not send:", e instanceof Error ? e.message : e);
  process.exit(1);
});
