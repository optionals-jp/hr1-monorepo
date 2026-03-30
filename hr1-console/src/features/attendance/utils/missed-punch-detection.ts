export interface MissedPunchEmployee {
  userId: string;
  displayName: string;
  email: string;
  type: "no_clock_in" | "no_clock_out";
  expectedTime: string;
}

export function detectMissedPunches(
  employees: Array<{ id: string; display_name: string | null; email: string }>,
  todayRecords: Array<{
    user_id: string;
    clock_in: string | null;
    clock_out: string | null;
    status: string;
  }>,
  settings: { work_start_time: string; work_end_time: string },
  currentTime: Date
): MissedPunchEmployee[] {
  const result: MissedPunchEmployee[] = [];

  const recordByUser = new Map(todayRecords.map((r) => [r.user_id, r]));

  const currentHHMM = `${String(currentTime.getHours()).padStart(2, "0")}:${String(currentTime.getMinutes()).padStart(2, "0")}`;

  for (const emp of employees) {
    const record = recordByUser.get(emp.id);

    if (!record) {
      if (currentHHMM > settings.work_start_time) {
        result.push({
          userId: emp.id,
          displayName: emp.display_name ?? emp.email,
          email: emp.email,
          type: "no_clock_in",
          expectedTime: settings.work_start_time,
        });
      }
      continue;
    }

    if (record.clock_in && !record.clock_out && currentHHMM > settings.work_end_time) {
      result.push({
        userId: emp.id,
        displayName: emp.display_name ?? emp.email,
        email: emp.email,
        type: "no_clock_out",
        expectedTime: settings.work_end_time,
      });
    }
  }

  return result;
}
