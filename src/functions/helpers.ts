// HELPERS

import { isNumber } from "../helpers/index";

const expectNumberValueError = (value: string) => `
  The function [[FUNCTION_NAME]] expects a number value, but '${value}' is a
  string, and cannot be coerced to a number.`;

export function toNumber(value: any): number {
  switch (typeof value) {
    case "number":
      return value;
    case "boolean":
      return value ? 1 : 0;
    case "string":
      if (isNumber(value) || value === "") {
        let n = Number(value);
        if (isNaN(n)) {
          if (value.includes("%")) {
            n = Number(value.split("%")[0]);
            if (!isNaN(n)) {
              return n / 100;
            }
          }
        } else {
          return n;
        }
      }
      throw new Error(expectNumberValueError(value));
    default:
      return 0;
  }
}

export function strictToNumber(value: any): number {
  if (value === "") {
    throw new Error(expectNumberValueError(value));
  }
  return toNumber(value);
}

export function visitNumbers(args: IArguments | any[], cb: (arg: number) => void): void {
  for (let n of args) {
    if (Array.isArray(n)) {
      for (let i of n) {
        for (let j of i) {
          if (typeof j === "number") {
            cb(j);
          }
        }
      }
    } else {
      cb(strictToNumber(n));
    }
  }
}

export function visitAny(arg: any, cb: (a: any) => void): void {
  if (Array.isArray(arg)) {
    for (let col of arg) {
      for (let cell of col) {
        cb(cell);
      }
    }
  } else {
    cb(arg);
  }
}

export function visitAnys(
  args: IArguments | any[],
  rangeCb: (a: any) => boolean,
  argCb: (a: any) => boolean
): void {
  for (let arg of args) {
    if (Array.isArray(arg)) {
      for (let col of arg) {
        for (let cell of col) {
          if (!rangeCb(cell)) return;
        }
      }
    } else {
      if (!argCb(arg)) return;
    }
  }
}

export function reduceArgs<T>(
  args: IArguments | any[],
  cb: (acc: T, a: any) => T,
  initialValue: T
): T {
  let val = initialValue;
  for (let arg of args) {
    visitAny(arg, (a) => {
      val = cb(val, a);
    });
  }
  return val;
}

export function reduceNumbers<T>(
  args: IArguments | any[],
  cb: (acc: T, a: any) => T,
  initialValue: T
): T {
  let val = initialValue;
  visitNumbers(args, (a) => {
    val = cb(val, a);
  });
  return val;
}

export function toString(value: any): string {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
      return value.toString();
    case "boolean":
      return value ? "TRUE" : "FALSE";
    default:
      return "";
  }
}

const expectBooleanValueError = (value: string) => `
  The function [[FUNCTION_NAME]] expects a boolean value, but '${value}' is a 
  text, and cannot be coerced to a number.
`;

export function toBoolean(value: any): boolean {
  switch (typeof value) {
    case "boolean":
      return value;
    case "string":
      if (value) {
        let uppercaseVal = value.toUpperCase();
        if (uppercaseVal === "TRUE") {
          return true;
        }
        if (uppercaseVal === "FALSE") {
          return false;
        }
        throw new Error(expectBooleanValueError(value));
      } else {
        return false;
      }
    case "number":
      return value ? true : false;
    default:
      return false;
  }
}

export function strictToBoolean(value: any): boolean {
  if (value === "") {
    throw new Error(expectBooleanValueError(value));
  }
  return toBoolean(value);
}

export function visitBooleans(args: IArguments, cb: (a: boolean) => boolean): void {
  visitAnys(
    args,
    (cell) => {
      if (typeof cell === "boolean") {
        return cb(cell);
      }
      if (typeof cell === "number") {
        return cb(cell ? true : false);
      }
      return true;
    },
    (arg) => (arg !== null ? cb(strictToBoolean(arg)) : true)
  );
}

// COMMON FUNCTIONS

/**
 * Perform a dichotomic search and return the index of the nearest match less than
 * or equal to the target. If all values in the range are greater than the target,
 * -1 is returned.
 * If the range is not in sorted order, an incorrect value might be returned.
 *
 * Example:
 * - [3, 6, 10], 3 => 0
 * - [3, 6, 10], 6 => 1
 * - [3, 6, 10], 9 => 1
 * - [3, 6, 10], 42 => 2
 * - [3, 6, 10], 2 => -1
 */
export function dichotomicPredecessorSearch(range: any[], target: any): number {
  const typeofTarget = typeof target;
  let min = 0;
  let max = range.length - 1;
  let avg = Math.ceil((min + max) / 2);
  let current = range[avg];
  while (max - min > 0) {
    if (typeofTarget === typeof current && current <= target) {
      min = avg;
    } else {
      max = avg - 1;
    }
    avg = Math.ceil((min + max) / 2);
    current = range[avg];
  }
  if (target < current) {
    // all values in the range are greater than the target, -1 is returned.
    return -1;
  }
  return avg;
}

/**
 * Perform a dichotomic search and return the index of the nearest match more than
 * or equal to the target. If all values in the range are smaller than the target,
 * -1 is returned.
 * If the range is not in sorted order, an incorrect value might be returned.
 *
 * Example:
 * - [10, 6, 3], 3 => 2
 * - [10, 6, 3], 6 => 1
 * - [10, 6, 3], 9 => 0
 * - [10, 6, 3], 42 => -1
 * - [10, 6, 3], 2 => 2
 */
export function dichotomicSuccessorSearch(range: any[], target: any): number {
  const typeofTarget = typeof target;
  let min = 0;
  let max = range.length - 1;
  let avg = Math.floor((min + max) / 2);
  let current = range[avg];
  while (max - min > 0) {
    if (typeofTarget === typeof current && target >= current) {
      max = avg;
    } else {
      min = avg + 1;
    }
    avg = Math.floor((min + max) / 2);
    current = range[avg];
  }
  if (target > current) {
    return avg - 1;
  }
  return avg;
}
