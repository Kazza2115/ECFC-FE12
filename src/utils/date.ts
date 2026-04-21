const MONTHS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const DAYS_LONG = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
];

const TRAINING_WEEKDAYS = [1, 3, 4];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = DAYS[d.getDay()];
  const date = d.getDate();
  const month = MONTHS[d.getMonth()];
  return `${day} ${date} ${month}`;
}

export function formatLongDate(iso: string): string {
  const d = new Date(iso);
  const day = DAYS_LONG[d.getDay()];
  const date = d.getDate();
  const month = MONTHS[d.getMonth()];
  return `${day} ${date} ${month}`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

export function todayISO(): string {
  return new Date().toISOString();
}

export function isTrainingDay(iso: string): boolean {
  return TRAINING_WEEKDAYS.includes(new Date(iso).getDay());
}

export function nextTrainingDates(count = 3, from: Date = new Date()): string[] {
  const results: string[] = [];
  const cursor = new Date(from);
  cursor.setHours(12, 0, 0, 0);
  while (results.length < count) {
    if (TRAINING_WEEKDAYS.includes(cursor.getDay())) {
      results.push(cursor.toISOString());
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return results;
}

export function sameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}
