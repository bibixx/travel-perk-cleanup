import dayjs from "dayjs";
import deepEqual from "deep-equal";
import { ICalEventData } from "ical-generator";
import { parseAddress } from "./parseAddress";

const getMinIndex = (events: ICalEventData[]) => {
  if (events.length === 0) {
    return -1;
  }

  let minIndex = 0;
  let min = (events[0]!.start as Date).getTime();

  for (let i = 1; i < events.length; i++) {
    const event = events[i]!;
    const time = (event.start as Date).getTime();

    if (time < min) {
      minIndex = i;
      min = time;
    }
  }

  return minIndex;
};

const getMaxIndex = (events: ICalEventData[]) => {
  if (events.length === 0) {
    return -1;
  }

  let maxIndex = 0;
  let max = (events[0]!.end as Date).getTime();

  for (let i = 1; i < events.length; i++) {
    const event = events[i];
    const time = (event!.end as Date).getTime();

    if (time > max) {
      maxIndex = i;
      max = time;
    }
  }

  return maxIndex;
};

const areAllStaySame = (events: ICalEventData[]) => {
  if (events.length <= 1) {
    return true;
  }

  const firstLocation = events[0]!.location;
  return events.every((e) => deepEqual(firstLocation, e.location));
};

const cityCountryMap: Record<string, string | undefined> = {
  Budapest: "🇭🇺",
};
const getLocationAddress = (location: ICalEventData["location"]) => {
  if (location === null || location === undefined) {
    return null;
  }

  if (typeof location === "string") {
    return location;
  }

  return location.address;
};
const getTripName = async (event: ICalEventData | undefined) => {
  let city = "Trip";

  if (event === undefined) {
    return { tripName: city, calendarName: city };
  }

  const locationAddress = getLocationAddress(event.location);
  if (locationAddress) {
    const address = await parseAddress(locationAddress);

    if (address.city !== null) {
      city = address.city;
    } else {
      const cities = Object.keys(cityCountryMap);
      const foundCity = cities.find((city) => locationAddress.includes(city));

      city = foundCity ?? city;
    }
  }

  const start = dayjs(event.start?.toString());
  const end = dayjs(event.end?.toString());
  const country = city ? cityCountryMap[city] : undefined;

  const nameDatePart = `(${start.format("DD.MM.YYYY")} – ${end.subtract(1, "day").format("DD.MM.YYYY")})`;
  const locationPart = country ? `${city} ${country}` : city ?? "";
  const tripName = `${locationPart} ${nameDatePart}`;

  return { tripName, calendarName: locationPart };
};

export const getWholeTripEvent = async (
  flightEvents: ICalEventData[],
  stayEvents: ICalEventData[]
): Promise<{
  event: ICalEventData;
  isStayOverride: boolean;
  calendarName: string;
}> => {
  const { tripName, calendarName } = await getTripName(stayEvents[0]);
  const events = [...stayEvents, ...flightEvents];

  const startIndex = getMinIndex(events);
  const endIndex = getMaxIndex(events);

  const startDate = dayjs(events[startIndex]?.start as Date | undefined).startOf("day");
  const endDate = dayjs(events[endIndex]?.end as Date | undefined).endOf("day");

  if (!startDate.isValid() || !endDate.isValid()) {
    throw new Error("Invalid whole trip event range dates");
  }

  const firstStayEvent = stayEvents[0];
  if (areAllStaySame(stayEvents) && firstStayEvent !== undefined) {
    return {
      isStayOverride: true,
      calendarName,
      event: {
        start: startDate.toDate(),
        end: endDate.toDate(),
        summary: tripName,
        allDay: true,
        location: firstStayEvent.location,
        description: [firstStayEvent.summary, firstStayEvent.description].filter(Boolean).join("\n"),
      },
    };
  }

  return {
    isStayOverride: false,
    calendarName,
    event: {
      start: startDate.toDate(),
      end: endDate.toDate(),
      allDay: true,
      summary: tripName,
    },
  };
};
