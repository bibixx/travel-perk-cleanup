import deepEqual from "deep-equal";
import { ICalEventData } from "ical-generator";

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

export const getWholeTripEvent = (
  tripName: string,
  flightEvents: ICalEventData[],
  stayEvents: ICalEventData[]
): {
  event: ICalEventData;
  isStayOverride: boolean;
} => {
  const events = [...stayEvents, ...flightEvents];

  const startIndex = getMinIndex(events);
  const endIndex = getMaxIndex(events);

  const startDate = events[startIndex]?.start as Date | undefined;
  const endDate = events[endIndex]?.end as Date | undefined;

  if (startDate === undefined || endDate === undefined) {
    throw new Error("Invalid whole trip event range dates");
  }

  const firstStayEvent = stayEvents[0];
  if (areAllStaySame(stayEvents) && firstStayEvent !== undefined) {
    return {
      isStayOverride: true,
      event: {
        start: startDate,
        end: endDate,
        summary: tripName,
        allDay: true,
        location: firstStayEvent.location,
        description: [firstStayEvent.summary, firstStayEvent.description].filter(Boolean).join("\n"),
      },
    };
  }

  return {
    isStayOverride: false,
    event: {
      start: startDate,
      end: endDate,
      allDay: true,
      summary: tripName,
    },
  };
};
