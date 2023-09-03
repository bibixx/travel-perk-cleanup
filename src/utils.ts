export function checkIfDefined<T>(data: T | undefined | null): asserts data is T {
  if (data === undefined || data === null) {
    throw new Error("Flight data not complete");
  }
}

export function findAndMap<T, U>(
  data: T[],
  predicate: (element: T, index: number, array: T[]) => U | null | undefined
): U | undefined {
  for (let i = 0; i < data.length; i++) {
    const el = data[i]!;
    const predicateValue = predicate(el, i, data);

    if (predicateValue !== null) {
      return predicateValue;
    }
  }

  return undefined;
}

export function findMapValidate<T, U>(
  data: T[],
  predicate: (element: T, index: number, array: T[]) => U | null | undefined
): U {
  const result = findAndMap<T, U>(data, predicate);
  checkIfDefined(result);

  return result;
}
