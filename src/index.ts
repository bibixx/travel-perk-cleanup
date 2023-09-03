import ical from "ical";
import icalGenerator, { ICalEventData, ICalLocation } from "ical-generator";
import dayjs from "dayjs";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { FlightDetails, parseFlight } from "./parseFlight";
import { parseStay, StayDetails } from "./parseStay";
import { getWholeTripEvent } from "./getWholeTripEvent";

process.env.TZ = "Etc/Universal";

const airportCountryMap: Record<string, string | undefined> = {
  BUD: "🇭🇺",
  WAW: "🇵🇱",
};

const getAirportLocation = (event: ical.CalendarComponent): ICalLocation | undefined => {
  const locationName = event.location;

  if (locationName === "Warsaw Chopin") {
    return {
      title: "Warsaw Chopin Airport",
      address: "Żwirki i Wigury 1, 00-906 Warsaw, Poland",
      geo: {
        lat: 52.16972321995726,
        lon: 20.972963854494708,
      },
      radius: 1400,
    };
  }

  if (locationName === "Budapest Ferenc Liszt International Airport") {
    return {
      title: "Budapest Ferenc Liszt International Airport",
      address: "BUD Nemzetközi Repülőtér, 1185 Budapest, Hungary",
      geo: {
        lat: 47.43856025466121,
        lon: 19.25223143093324,
      },
      radius: 1400,
    };
  }

  if (locationName !== undefined) {
    return {
      title: locationName,
      geo: event.geo,
    };
  }

  return undefined;
};

const getFlightSummary = (flight: FlightDetails): string => {
  const start = flight.from.code;
  const end = flight.to.code;
  const startFlag = airportCountryMap[start];
  const endFlag = airportCountryMap[end];

  const startLabel = startFlag !== undefined ? `${startFlag} ${start}` : start;
  const endLabel = endFlag !== undefined ? `${end} ${endFlag}` : end;
  const fromTo = [startLabel, endLabel].join(" → ");

  return `[${flight.flightNumber}] ${fromTo}`;
};

const getFlightDescription = (flight: FlightDetails): string => {
  return [
    `Flight number: ${flight.flightNumber}`,
    `Duration: ${flight.duration}`,
    `Seat: ${flight.seat ?? "N/A"}`,
    `Reservation number: ${flight.reservationNumber}`,
  ].join("\n");
};

const getStayDescription = (stay: StayDetails): string => {
  const checkIn = stay.checkIn ? dayjs(stay.checkIn) : null;
  const checkOut = stay.checkOut ? dayjs(stay.checkOut) : null;
  return [
    checkIn != null && `Check In: ${checkIn.format("DD.MM.YYYY H:mm:ss")}`,
    checkOut != null && `Check Out: ${checkOut.format("DD.MM.YYYY H:mm:ss")}`,
    `Booking Reference: ${stay.bookingReference ?? "N/A"}`,
  ]
    .filter(Boolean)
    .join("\n");
};

(async () => {
  const dataPath = join(__dirname, "..", "data", "travelperk-trip.ics");
  const data = ical.parseICS(await readFile(dataPath, "utf-8"));

  const flightEvents: ICalEventData[] = [];
  const stayEvents: ICalEventData[] = [];

  for (let k in data) {
    if (data.hasOwnProperty(k)) {
      const event = data[k]!;

      if (event.type !== "VEVENT") {
        continue;
      }

      if (event.description?.includes("Departure")) {
        const flightDetails = parseFlight(event);
        const summary = getFlightSummary(flightDetails);
        const description = getFlightDescription(flightDetails);

        flightEvents.push({
          start: event.start,
          end: event.end,
          summary,
          description,
          location: getAirportLocation(event),
          categories: [{ name: "TRAVEL" }],
          url: flightDetails.url,
        });

        continue;
      }

      if (event.description?.includes("Hotel information")) {
        const stayDetails = parseStay(event);
        const summary = `Stay at ${stayDetails.hotelName}`;
        const description = getStayDescription(stayDetails);

        const eventStart = event.start as (Date & { dateOnly?: boolean }) | undefined;
        const eventEnd = event.end as (Date & { dateOnly?: boolean }) | undefined;
        const start = dayjs(eventStart);
        const end = dayjs(eventEnd);

        stayEvents.push({
          start: start.toDate(),
          end: end.toDate(),
          allDay: true,
          location: stayDetails.location,
          summary,
          description,
        });

        continue;
      }
    }
  }

  const { isStayOverride, event: wholeTripEvent, calendarName } = await getWholeTripEvent(flightEvents, stayEvents);

  const calendar = icalGenerator({ name: calendarName });
  flightEvents.forEach((event) => calendar.createEvent(event));
  calendar.createEvent(wholeTripEvent);

  if (!isStayOverride) {
    stayEvents.forEach((event) => calendar.createEvent(event));
  }

  const outPath = join(__dirname, "..", "out", "travelperk-trip.ics");
  await calendar.save(outPath);
})();
