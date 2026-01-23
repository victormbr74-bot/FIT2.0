export function getWeekId(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.round((firstThursday - target.valueOf()) / 604800000);
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

export function getWeekDates(startDate: Date = new Date()) {
  const current = new Date(startDate);
  const day = current.getDay();
  const distance = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(current);
  weekStart.setDate(current.getDate() + distance);
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
}
