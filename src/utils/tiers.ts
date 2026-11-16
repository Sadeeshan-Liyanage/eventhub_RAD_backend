import { IEvent } from "../models/Event";

export interface Tier {
  name: string;
  price: number;
  seats: number;
}



export const getTiers = (e: Pick<IEvent, "ticketTypes" | "price" | "totalSeats">): Tier[] =>
  e.ticketTypes && e.ticketTypes.length > 0
    ? e.ticketTypes.map((t) => ({ name: t.name, price: t.price, seats: t.seats }))
    : [{ name: "General", price: e.price, seats: e.totalSeats }];

    
    
export const tierForSeat = (tiers: Tier[], seat: number): Tier | null => {
  let start = 0;
  for (const t of tiers) {
    if (seat <= start + t.seats) return t;
    start += t.seats;
  }
  return null;
};

export const sameTiers = (a: Tier[], b: Tier[]): boolean =>
  a.length === b.length && a.every((t, i) => t.name === b[i].name && t.price === b[i].price && t.seats === b[i].seats);
