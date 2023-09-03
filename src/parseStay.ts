import dayjs from "dayjs";
import { CalendarComponent } from "ical";
import { ICalLocation } from "ical-generator";
import { checkIfDefined, findAndMap, findMapValidate } from "./utils";

export interface StayDetails {
  hotelName: string;
  location: ICalLocation;
  bookingReference: string | undefined;
  checkIn: Date | undefined;
  checkOut: Date | undefined;
}

const getAddress = (line: string) => {
  if (!line.startsWith("Address")) {
    return null;
  }

  const parts = line.split(": ");
  return parts.at(-1)?.trim() ?? null;
};

const getBookingReference = (line: string) => {
  if (!line.startsWith("Booking Reference")) {
    return null;
  }

  const parts = line.split(": ");
  const result = parts.at(-1)?.trim() ?? null;

  if (result === "None") {
    return null;
  }

  return result;
};

const fixDate = (date: string) => {
  const match = date.match(/[^ ]20\d\d$/);
  if (match?.index === undefined) {
    const firstSpaceIndex = date.indexOf(" ");
    return date.slice(Math.max(0, firstSpaceIndex + 1));
  }

  const index = match.index + 1;

  const firstSpaceIndex = date.indexOf(" ");
  const dateStartStart = Math.max(firstSpaceIndex + 1, 0);
  const dateStart = date.substring(dateStartStart, index);
  const dateYear = date.substring(index);

  return `${dateStart} ${dateYear}`;
};

const parseTime = (time: string) => {
  const partOfDayOffset = time.toLocaleLowerCase().includes("am") ? 0 : 12;
  const [hoursMatch, minutesMatch] = time.matchAll(/\d+/g);
  const hoursString = hoursMatch?.[0] ?? "00";
  const minutesString = minutesMatch?.[0] ?? "00";

  const hours = Number.parseInt(hoursString, 10);
  const minutes = Number.parseInt(minutesString, 10);

  return { hours: hours + partOfDayOffset, minutes };
};

const parseCheckDateTime = (dateTimeString: string, splitText: string) => {
  const dateParts = dateTimeString.split(splitText);
  const datePart = dateParts[0]?.trim();
  const timePart = dateParts[1]?.trim();

  if (datePart === undefined) {
    return null;
  }

  const dateString = fixDate(datePart);
  const time = timePart !== undefined ? parseTime(timePart) : null;

  const date = dayjs(dateString, "D MMMM YYYY");
  const dateTime = date
    .minute(time?.minutes ?? 0)
    .hour(time?.hours ?? 0)
    .toDate();

  return dateTime;
};

const getCheckIn = (line: string): Date | null => {
  if (!line.toLowerCase().startsWith("check in")) {
    return null;
  }

  const parts = line.split(": ");
  const dateTimeString = parts.at(-1)?.trim();

  if (dateTimeString === undefined) {
    return null;
  }

  return parseCheckDateTime(dateTimeString, "from");
};

const getCheckOut = (line: string) => {
  if (!line.toLowerCase().startsWith("check out")) {
    return null;
  }

  const parts = line.split(": ");
  const dateTimeString = parts.at(-1)?.trim();

  if (dateTimeString === undefined) {
    return null;
  }

  return parseCheckDateTime(dateTimeString, "until");
};

export const parseStay = (event: CalendarComponent): StayDetails => {
  if (event.summary === undefined) {
    throw new Error("Stay event without summary");
  }

  if (event.description === undefined) {
    throw new Error("Stay event without description");
  }

  const lines = event.description.split("\n");
  const hotelName = lines[1];
  const address = findMapValidate(lines, getAddress);

  checkIfDefined(hotelName);
  const location: ICalLocation = {
    title: hotelName,
    address: address,
    geo: event.geo,
  };

  const checkIn = findAndMap(lines, getCheckIn);
  const checkOut = findAndMap(lines, getCheckOut);
  const bookingReference = findAndMap(lines, getBookingReference);

  return { hotelName, location, bookingReference, checkIn, checkOut };
};
