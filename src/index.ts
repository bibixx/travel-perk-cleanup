import ical from "ical";
import icalGenerator, { ICalEventData, ICalLocation } from "ical-generator";
import dayjs from "dayjs";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseAddress } from "./parseAddress";
import { FlightDetails, parseFlight } from "./parseFlight";
import { parseStay } from "./parseStay";
import { getWholeTripEvent } from "./getWholeTripEvent";

const cityCountryMap: Record<string, string | undefined> = {
  Budapest: "🇭🇺",
};
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
    `Seat: ${flight.seat}`,
    `Reservation number: ${flight.reservationNumber}`,
  ].join("\n");
};

(async () => {
  const dataPath = join(__dirname, "..", "data", "travelperk-trip.ics");
  const data = ical.parseICS(await readFile(dataPath, "utf-8"));

  let calendarName = "Trip";
  let tripName = "Trip";
  const flightEvents: ICalEventData[] = [];
  const stayEvents: ICalEventData[] = [];

  for (let k in data) {
    if (data.hasOwnProperty(k)) {
      const event = data[k]!;

      if (event.type !== "VEVENT") {
        continue;
      }

      if (event.description === undefined) {
        let city = "Trip";

        if (event.location) {
          const address = await parseAddress(event.location);
          city = address.city ?? city;
        }

        const start = dayjs(event.start).startOf("day").add(1, "day");
        const end = dayjs(event.end).endOf("day").add(1, "day");
        const country = city ? cityCountryMap[city] : undefined;

        const nameDatePart = `(${start.format("DD-MM-YYYY")} – ${end.format("DD-MM-YYYY")})`;
        const locationPart = country ? `${city} ${country}` : city ?? "";
        const name = `${locationPart} ${nameDatePart}`;

        tripName = locationPart;
        calendarName = name;

        continue;
      }

      if (event.description?.includes("DEPART")) {
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
        });

        continue;
      }

      if (event.description?.includes("nights at")) {
        const stay = parseStay(event);

        const start = dayjs(event.start).startOf("day").add(1, "day");
        const end = dayjs(event.end).startOf("day").add(1, "day");

        console.log(stay.location);

        stayEvents.push({
          start: start.toDate(),
          end: end.toDate(),
          allDay: true,
          location: stay.location,
          summary: `Stay at ${stay.hotelName}`,
          description: stay.confirmationNumber ? `Confirmation number: ${stay.confirmationNumber}` : undefined,
        });

        continue;
      }
    }
  }

  const calendar = icalGenerator({ name: calendarName });

  flightEvents.forEach((event) => calendar.createEvent(event));
  const { isStayOverride, event: wholeTripEvent } = getWholeTripEvent(tripName, flightEvents, stayEvents);
  calendar.createEvent(wholeTripEvent);

  if (!isStayOverride) {
    stayEvents.forEach((event) => calendar.createEvent(event));
  }

  // console.log(calendar.toJSON().events.map((e) => e.summary));
  const outPath = join(__dirname, "..", "out", "travelperk-trip.ics");
  await calendar.save(outPath);
})();
