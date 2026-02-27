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

export const defaultWageCalculationRules: WageCalculationRules = {
  standardDailyHours: 4,
  statusPolicies: {
    present: 'actual_only',
    absent: 'fixed_zero',
    paid_leave: 'fixed_standard',
    scheduled_holiday: 'fixed_zero',
    special_leave: 'fixed_standard',
  },
};

export function applyWageRuleOverride(override?: Partial<WageCalculationRules>): WageCalculationRules {
  if (!override) return defaultWageCalculationRules;
  return {
    standardDailyHours: override.standardDailyHours ?? defaultWageCalculationRules.standardDailyHours,
    statusPolicies: {
      ...defaultWageCalculationRules.statusPolicies,
      ...(override.statusPolicies || {}),
    },
  };
}
