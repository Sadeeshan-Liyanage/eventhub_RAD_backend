import QRCode from "qrcode";
import { Mail } from "./email.service";

const TZ = "Asia/Colombo";


const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

const when = (d: Date) =>
  d.toLocaleString("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

const money = (n: number) => (n === 0 ? "Free" : `LKR ${n.toLocaleString("en-LK")}`);

const layout = (heading: string, intro: string, rows: [string, string][], button?: { label: string; url: string }, extra = "") => `<!doctype html>
<html><body style="margin:0;background:#f4f5fa;font-family:Arial,Helvetica,sans-serif;color:#1b1a55;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5fa;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #dcdeee;">
<tr><td style="background:#1b1a55;padding:18px 24px;color:#ffffff;font-size:20px;font-weight:bold;"><span style="color:#f5b301;">&#9679;</span> EventHub</td></tr>
<tr><td style="padding:24px;">
<h1 style="margin:0 0 8px;font-size:22px;">${esc(heading)}</h1>
<p style="margin:0 0 18px;font-size:15px;line-height:1.5;">${intro}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #dcdeee;">
${rows.map(([k, v]) => `<tr><td style="padding:9px 0;border-bottom:1px solid #dcdeee;font-size:13px;color:#5b5a99;width:34%;">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #dcdeee;font-size:14px;font-weight:bold;">${v}</td></tr>`).join("")}
</table>
${extra}
${button ? `<p style="margin:24px 0 0;"><a href="${esc(button.url)}" style="background:#f5b301;color:#1b1a55;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px;display:inline-block;">${esc(button.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:14px 24px;background:#f4f5fa;font-size:12px;color:#5b5a99;">You are receiving this because of activity on your EventHub account.</td></tr>
</table></td></tr></table></body></html>`;

export interface TicketInfo {
  name: string;
  eventTitle: string;
  eventDate: Date;
  venue: string;
  seats: string[];
  total: number;
  ticketCode: string;
  ticketUrl: string;
  bookingId: string;
}

const ticketRows = (t: TicketInfo): [string, string][] => [
  ["Event", esc(t.eventTitle)],
  ["When", esc(when(t.eventDate))],
  ["Where", esc(t.venue)],
  ["Seats", esc(t.seats.join(", "))],
  ["Total", esc(money(t.total))],
  ["Ticket code", `<span style="font-family:monospace;letter-spacing:1px;">${esc(t.ticketCode)}</span>`],
];

const ticketText = (t: TicketInfo) =>
  `Event: ${t.eventTitle}\nWhen: ${when(t.eventDate)}\nWhere: ${t.venue}\nSeats: ${t.seats.join(", ")}\nTotal: ${money(t.total)}\nTicket code: ${t.ticketCode}\n`;

export const bookingConfirmedMail = async (to: string, t: TicketInfo): Promise<Mail> => {


  const qr = await QRCode.toBuffer(JSON.stringify({ code: t.ticketCode, booking: t.bookingId }), { width: 240, margin: 1 });
  const extra = `<p style="margin:20px 0 0;text-align:center;"><img src="cid:ticketqr" width="180" height="180" alt="Ticket QR code" style="border:1px solid #dcdeee;border-radius:8px;"><br><span style="font-size:12px;color:#5b5a99;">Show this QR code at the entrance</span></p>`;
  return {
    to,
    subject: `Your ticket for ${t.eventTitle}`,
    html: layout("Your booking is confirmed", `Hi ${esc(t.name)}, your seats are booked. See you at the event!`, ticketRows(t), { label: "View my ticket", url: t.ticketUrl }, extra),
    text: `Hi ${t.name},\n\nYour booking is confirmed.\n\n${ticketText(t)}\nView your ticket: ${t.ticketUrl}\n`,
    attachments: [{ filename: "ticket-qr.png", content: qr, cid: "ticketqr", contentType: "image/png" }],
  };
};

export const bookingCancelledMail = (to: string, t: TicketInfo): Mail => ({
  to,
  subject: `Booking cancelled: ${t.eventTitle}`,
  html: layout("Your booking was cancelled", `Hi ${esc(t.name)}, your booking has been cancelled and your seats were released.`, ticketRows(t)),
  text: `Hi ${t.name},\n\nYour booking has been cancelled and your seats were released.\n\n${ticketText(t)}`,
});

export const eventCancelledMail = (to: string, t: TicketInfo): Mail => ({
  to,
  subject: `Event cancelled: ${t.eventTitle}`,
  html: layout(
    "This event was cancelled",
    `Hi ${esc(t.name)}, we're sorry to let you know that the organizer has cancelled <strong>${esc(t.eventTitle)}</strong>. Your booking has been cancelled automatically.`,
    ticketRows(t)
  ),
  text: `Hi ${t.name},\n\nThe organizer has cancelled "${t.eventTitle}". Your booking has been cancelled automatically.\n\n${ticketText(t)}`,
});

export const reminderMail = (to: string, t: TicketInfo): Mail => ({
  to,
  subject: `Reminder: ${t.eventTitle} is coming up`,
  html: layout("Your event is coming up", `Hi ${esc(t.name)}, a quick reminder about your upcoming event.`, ticketRows(t), { label: "Open my ticket", url: t.ticketUrl }),
  text: `Hi ${t.name},\n\nA quick reminder about your upcoming event.\n\n${ticketText(t)}\nOpen your ticket: ${t.ticketUrl}\n`,
});

export const soldOutMail = (to: string, organizer: string, title: string, date: Date, dashboardUrl: string): Mail => ({
  to,
  subject: `Sold out: ${title}`,
  html: layout("Your event is sold out", `Hi ${esc(organizer)}, every ticket for <strong>${esc(title)}</strong> has been booked.`, [["Event", esc(title)], ["When", esc(when(date))]], { label: "Open dashboard", url: dashboardUrl }),
  text: `Hi ${organizer},\n\nEvery ticket for "${title}" (${when(date)}) has been booked.\n\nDashboard: ${dashboardUrl}\n`,
});



