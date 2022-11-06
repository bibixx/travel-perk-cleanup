import type { CalendarComponent } from "ical";

export interface FlightDetails {
  flightNumber: string;
  duration: string;
  seat: string;
  reservationNumber: string;
  from: {
    city: string;
    code: string;
  };
  to: {
    city: string;
    code: string;
  };
}

function findAndMap<T, U>(data: T[], predicate: (element: T, index: number) => U | null | undefined): U | undefined {
  for (let i = 0; i < data.length; i++) {
    const el = data[i];
    const predicateValue = predicate(el, i);

    if (predicateValue !== null) {
      return predicateValue;
    }
  }

  return undefined;
}

function checkIfDefined<T>(data: T | undefined): asserts data is T {
  if (data === undefined) {
    throw new Error("Flight data not complete");
  }
}

const getFlightNumber = (line: string) => {
  if (!line.includes("operated by")) {
    return null;
  }

  const parts = line.split("-");
  return parts.at(-1)?.trim();
};

const getDuration = (line: string) => {
  if (!line.startsWith("DURATION")) {
    return null;
  }

  return line.substring("DURATION: ".length);
};

const getSeat = (line: string) => {
  const searchString = "Seat: ";
  if (!line.includes(searchString)) {
    return null;
  }

  return line.substring(line.indexOf(searchString) + searchString.length);
};

const getReservationNumber = (line: string) => {
  const searchString = "Reservation number: ";
  if (!line.includes(searchString)) {
    return null;
  }

  return line.substring(line.indexOf(searchString) + searchString.length);
};

const getTo = (line: string, index: number): FlightDetails["to"] | null => {
  if (index > 0) {
    return null;
  }

  const [, to] = line.split(" - ");
  const codeStart = to.lastIndexOf(" ");
  const city = to.substring(0, codeStart);
  const code = to.substring(codeStart + 1);

  return {
    city,
    code,
  };
};

const getFrom = (line: string, index: number): FlightDetails["from"] | null => {
  if (index > 0) {
    return null;
  }

  const [from] = line.split(" - ");
  const codeStart = from.lastIndexOf(" ");
  const city = from.substring(0, codeStart);
  const code = from.substring(codeStart + 1);

  return {
    city,
    code,
  };
};

export const parseFlight = (event: CalendarComponent): FlightDetails => {
  if (event.description === undefined) {
    throw new Error("Flight event without details");
  }

  const lines = event.description.split("\n");
  const flightNumber = findAndMap(lines, getFlightNumber);
  const duration = findAndMap(lines, getDuration);
  const seat = findAndMap(lines, getSeat);
  const reservationNumber = findAndMap(lines, getReservationNumber);
  const from = findAndMap(lines, getFrom);
  const to = findAndMap(lines, getTo);

  checkIfDefined(flightNumber);
  checkIfDefined(duration);
  checkIfDefined(seat);
  checkIfDefined(reservationNumber);
  checkIfDefined(from);
  checkIfDefined(to);

  return { flightNumber, duration, seat, reservationNumber, from, to };
};
