const minuteMs = 60_000;
const dayMs = 24 * 60 * minuteMs;

function toDatePart(value: Date) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getLocalDayRange(offsetMinutes: number, now = new Date()) {
  const utcNowMs = now.getTime();
  const localNowMs = utcNowMs - offsetMinutes * minuteMs;
  const localNow = new Date(localNowMs);
  const localStartMs = Date.UTC(
    localNow.getUTCFullYear(),
    localNow.getUTCMonth(),
    localNow.getUTCDate(),
  );
  const localEndMs = localStartMs + dayMs;
  const startUtcMs = localStartMs + offsetMinutes * minuteMs;
  const endUtcMs = localEndMs + offsetMinutes * minuteMs;

  return {
    date: toDatePart(new Date(localStartMs)),
    nowUtcMs: utcNowMs,
    startUtcMs,
    endUtcMs,
    startUtcIso: new Date(startUtcMs).toISOString(),
    endUtcIso: new Date(endUtcMs).toISOString(),
  };
}

export function getOverlappingSeconds({
  startedAt,
  endedAt,
  nowUtcMs,
  startUtcMs,
  endUtcMs,
}: {
  startedAt: string;
  endedAt: string | null;
  nowUtcMs: number;
  startUtcMs: number;
  endUtcMs: number;
}) {
  const startedAtMs = new Date(startedAt).getTime();
  const endedAtMs = endedAt ? new Date(endedAt).getTime() : nowUtcMs;
  const effectiveStartMs = Math.max(startedAtMs, startUtcMs);
  const effectiveEndMs = Math.min(endedAtMs, endUtcMs);

  return Math.max(0, Math.floor((effectiveEndMs - effectiveStartMs) / 1000));
}
