import { CalendarComponent } from "ical";
import { ICalLocation } from "ical-generator";

interface StayDetails {
  hotelName: string;
  location: ICalLocation;
  confirmationNumber: string | undefined;
}

export const parseStay = (event: CalendarComponent): StayDetails => {
  if (event.summary === undefined) {
    throw new Error("Stay event without summary");
  }

  const hotelName = event.summary.substring(0, event.summary.lastIndexOf(" ("));
  const location: ICalLocation = {
    title: hotelName,
    address: event.location,
    geo: event.geo,
  };

  const lines = event.description?.split("\n") ?? [];
  const confirmationNumberLine = lines.find((line) => line.startsWith("Confirmation number: "));
  const confirmationNumber = confirmationNumberLine !== undefined ? confirmationNumberLine.split(": ")[1] : undefined;

  return { hotelName, location, confirmationNumber };
};
