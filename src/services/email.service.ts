import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: Buffer; cid?: string; contentType?: string }[];
}

let transporter: Transporter | null = null;

export const emailEnabled = (): boolean => Boolean(env.smtpHost);

const getTransporter = (): Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465, 
      
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    });
  }
  return transporter;
};



export const sendEmail = async (mail: Mail): Promise<boolean> => {
  if (!emailEnabled()) {
    console.log(`[email skipped: SMTP not configured] "${mail.subject}" -> ${mail.to}`);
    return false;
  }
  await getTransporter().sendMail({ from: env.emailFrom, ...mail });
  return true;
};


