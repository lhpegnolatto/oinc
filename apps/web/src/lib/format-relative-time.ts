const relativeTimeFormatter = new Intl.RelativeTimeFormat("en-US", {
  numeric: "auto",
});

const UNITS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "seconds" },
  { amount: 60, unit: "minutes" },
  { amount: 24, unit: "hours" },
  { amount: 7, unit: "days" },
  { amount: 4.34524, unit: "weeks" },
  { amount: 12, unit: "months" },
  { amount: Number.POSITIVE_INFINITY, unit: "years" },
];

export function formatRelativeTime(date: Date, now = new Date()) {
  let diffInSeconds = (date.getTime() - now.getTime()) / 1000;

  for (const { amount, unit } of UNITS) {
    if (Math.abs(diffInSeconds) < amount) {
      return relativeTimeFormatter.format(Math.round(diffInSeconds), unit);
    }
    diffInSeconds /= amount;
  }

  return relativeTimeFormatter.format(Math.round(diffInSeconds), "years");
}
