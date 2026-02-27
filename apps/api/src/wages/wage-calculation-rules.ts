export type AttendanceDayStatusRule =
  | 'present'
  | 'absent'
  | 'paid_leave'
  | 'scheduled_holiday'
  | 'special_leave';

export type DayStatusHoursPolicy = 'actual_only' | 'fixed_zero' | 'fixed_standard';

export type WageCalculationRules = {
  standardDailyHours: number;
  statusPolicies: Record<AttendanceDayStatusRule, DayStatusHoursPolicy>;
};

const defaultRules: WageCalculationRules = {
  standardDailyHours: 4,
  statusPolicies: {
    present: 'actual_only',
    absent: 'fixed_zero',
    paid_leave: 'fixed_standard',
    scheduled_holiday: 'fixed_zero',
    special_leave: 'fixed_standard',
  },
};

const organizationOverrides: Record<string, Partial<WageCalculationRules>> = {
  // 将来、事業所別設定をここに追加
};

export function getWageCalculationRules(organizationId: string): WageCalculationRules {
  const override = organizationOverrides[organizationId];
  if (!override) return defaultRules;
  return {
    standardDailyHours: override.standardDailyHours ?? defaultRules.standardDailyHours,
    statusPolicies: {
      ...defaultRules.statusPolicies,
      ...(override.statusPolicies || {}),
    },
  };
}
