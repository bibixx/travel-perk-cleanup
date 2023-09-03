import type { CalendarComponent } from "ical";
import { findAndMap, findMapValidate } from "./utils";

export interface FlightDetails {
  flightNumber: string;
  duration: string;
  seat: string | undefined;
  reservationNumber: string;
  from: {
    city: string;
    code: string;
  };
  to: {
    city: string;
    code: string;
  };
  url: string;
}

const getFlightNumber = (line: string) => {
  if (!line.includes("Flight Number")) {
    return null;
  }

  const parts = line.split(": ");
  return parts.at(-1)?.trim() ?? null;
};

const getDuration = (line: string) => {
  if (!line.startsWith("Flight Duration")) {
    return null;
  }

  const parts = line.split(": ");
  return parts.at(-1)?.trim() ?? null;
};

const getSeat = () => {
  return undefined;
};

const getReservationNumber = (line: string) => {
  const searchString = "Booking Reference";
  if (!line.includes(searchString)) {
    return null;
  }

  const parts = line.split(": ");
  return parts.at(-1)?.trim() ?? null;
};

const getTo = (line: string, index: number, allLines: string[]): FlightDetails["to"] | null => {
  const nextLine = allLines[index + 1];
  if (nextLine === undefined) {
    return null;
  }

  if (!line.startsWith("Arrival")) {
    return null;
  }

  const codeStart = nextLine.lastIndexOf(" (");
  const city = nextLine.substring(0, codeStart).trim();
  const code = nextLine.substring(codeStart + 2, nextLine.length - 1);

  return {
    city,
    code,
  };
};

const getFrom = (line: string, index: number, allLines: string[]): FlightDetails["from"] | null => {
  const nextLine = allLines[index + 1];
  if (nextLine === undefined) {
    return null;
  }

  if (!line.startsWith("Departure")) {
    return null;
  }

  const codeStart = nextLine.lastIndexOf(" (");
  const city = nextLine.substring(0, codeStart).trim();
  const code = nextLine.substring(codeStart + 2, nextLine.length - 1);

  return {
    city,
    code,
  };
};

const getUrl = (line: string): string | null => {
  if (!line.includes("View full booking details here")) {
    return null;
  }

  const result = line.match(/href="(.+?)"/);

  if (result === null) {
    return null;
  }

  return result[1] ?? null;
};

export const parseFlight = (event: CalendarComponent): FlightDetails => {
  if (event.description === undefined) {
    throw new Error("Flight event without details");
  }

  const lines = event.description.split("\n");
  const flightNumber = findMapValidate(lines, getFlightNumber);
  const duration = findMapValidate(lines, getDuration);
  const reservationNumber = findMapValidate(lines, getReservationNumber);
  const from = findMapValidate(lines, getFrom);
  const to = findMapValidate(lines, getTo);
  const url = findMapValidate(lines, getUrl);
  const seat = findAndMap(lines, getSeat);

  return { flightNumber, duration, reservationNumber, seat, from, to, url };
};
