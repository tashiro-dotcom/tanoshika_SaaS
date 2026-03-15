# /admin Dependency Map

Captured on 2026-03-15 before the `/admin` refactor.

## Sections

1. Guide card
2. UAT record
3. Auth / MFA
4. Service users
5. Attendance
6. Wages

## Shared State Inventory

| State group | Source in current file | Used by |
| --- | --- | --- |
| Auth session (`email`, `password`, `otp`, `challengeToken`, `accessToken`, `refreshToken`, `sessionInfo`, `error`, `loading`) | top-level `useState` in `admin-console.tsx` | auth section, every authenticated action |
| Global ops message (`opsInfo`) | top-level `useState` | auth section display, service users, attendance, wages, UAT copy action |
| Service user data (`serviceUsers`, `inlineStatusDrafts`, `recentCreatedUserId`, `updatingServiceUserId`, create-form fields) | top-level `useState` | service users section, attendance section |
| Attendance data (`attendanceLogs`, `attendanceCorrections`, `attendanceDayStatuses`, correction fields, quick clock state, workDate`, day-status drafts`) | top-level `useState` | attendance section |
| Wage data (`wageTemplates`, `wageRules`, `wageRuleChangeReason`, `wageRuleRequests`, `wageRuleReviewCommentById`, `wageCalculations`, `wageSlip`, `wageYear`, `wageMonth`, `approveWageId`, `slipWageId`) | top-level `useState` | wages section |
| UAT state (`uatChecks`, `uatExecutor`, `uatEnvironment`, `uatNotes`) | top-level `useState` + `localStorage` effects | UAT section |

## Side Effects

| Effect | Trigger | Current dependency |
| --- | --- | --- |
| Attendance day status auto refresh | `tokenReady`, `accessToken`, `workDate` | attendance depends on auth token |
| UAT restore from `localStorage` | initial mount | UAT only |
| UAT save to `localStorage` | `uatChecks`, `uatExecutor`, `uatEnvironment`, `uatNotes` | UAT only |

## Cross-section Dependencies

- `auth -> all`: every API call depends on `accessToken`, `tokenReady`, `loading`, `error`, `opsInfo`.
- `service-users -> attendance`: attendance uses `serviceUsers` to label rows and select correction targets.
- `attendance -> wages`: no direct state dependency; wages is API-driven.
- `UAT -> auth feedback`: copy result is shown through the same global `opsInfo` / `error` area as other operations.

## Extraction Order Rationale

1. `auth`: provides token + global feedback/loading used by all other sections.
2. `service-users`: owns the list consumed by attendance rows.
3. `attendance`: largest consumer of shared operational state after auth.
4. `wages`: isolated from attendance/service-user state and can move after token plumbing is stable.
5. `UAT`: smallest and locally persistent; safest to move last.
