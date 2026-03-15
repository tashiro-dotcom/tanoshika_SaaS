# /admin Baseline API Calls

Baseline captured on 2026-03-15 from the current `/admin` implementation before refactor.

## Build Baseline

- Command: `npm run build -w apps/web`
- Result: pass
- `/admin` build output size: `10.4 kB` route JS, `97.6 kB` first load JS
- Manual spot-checks on local dev: `GET /service-users?page=1&limit=20` -> `200`, `GET /attendance-statuses?...limit=200` -> `200`, `POST /attendance-statuses/upsert` -> `201`, `POST /auth/logout` -> `201`

## Flow 1: Login -> MFA -> Session Maintenance

| Step | Method | Endpoint | Request body shape | Response shape |
| --- | --- | --- | --- | --- |
| Login start | `POST` | `/auth/login` | `{ email: string, password: string }` | `{ mfaRequired: boolean, challengeToken: string, email: string }` |
| MFA verify | `POST` | `/auth/mfa/verify` | `{ challengeToken: string, otp: string }` | `{ accessToken: string, refreshToken: string, expiresIn: number }` |
| Refresh | `POST` | `/auth/refresh` | `{ refreshToken: string }` | `{ accessToken: string, refreshToken: string, expiresIn: number }` |
| Logout | `POST` | `/auth/logout` | `{ refreshToken: string }` | `{ success: boolean }` |

Notes:
- All authenticated requests after MFA send `Authorization: Bearer <accessToken>`.
- `NEXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:3001` when unset.

## Flow 2: Service User Registration -> Status Update

| Step | Method | Endpoint | Request body shape | Response shape |
| --- | --- | --- | --- | --- |
| Load list | `GET` | `/service-users?page=1&limit=20` | none | `ServiceUser[]` |
| Create | `POST` | `/service-users` | `{ fullName: string, disabilityCategory?: string, contractDate?: string, phone?: string, emergencyContact?: string, status: ServiceUserStatus }` | `ServiceUser` |
| Inline status update | `PATCH` | `/service-users/:id/status` | `{ status: ServiceUserStatus }` | `ServiceUser` |

## Flow 3: Clock In -> Clock Out

| Step | Method | Endpoint | Request body shape | Response shape |
| --- | --- | --- | --- | --- |
| Load attendance table | `GET` | `/attendance?page=1&limit=20` | none | `AttendanceLog[]` |
| Load day statuses | `GET` | `/attendance-statuses?from=<iso>&to=<iso>&page=1&limit=200` | none | `AttendanceDayStatus[]` |
| Clock in | `POST` | `/attendance/clock-in` | `{ serviceUserId: string, method?: string, location?: string }` | `AttendanceLog` |
| Clock out | `POST` | `/attendance/clock-out` | `{ serviceUserId: string }` | `AttendanceLog` |
| Upsert day status | `POST` | `/attendance-statuses/upsert` | `{ serviceUserId: string, workDate: string, status: AttendanceDayStatusValue, note?: string }` | `AttendanceDayStatus` |

## Flow 4: Attendance Correction -> Approval

| Step | Method | Endpoint | Request body shape | Response shape |
| --- | --- | --- | --- | --- |
| Create correction | `POST` | `/attendance-corrections` | `{ attendanceLogId: string, reason: string, requestedClockInAt?: string, requestedClockOutAt?: string }` | `AttendanceCorrection` |
| Approve correction | `POST` | `/attendance-corrections/:id/approve` | `{}` | `AttendanceCorrection` |

Notes:
- Current `/admin` keeps correction rows in client state only; it does not fetch an index endpoint.

## Flow 5: Monthly Wages -> Slip Download

| Step | Method | Endpoint | Request body shape | Response shape |
| --- | --- | --- | --- | --- |
| Load templates | `GET` | `/wages/templates` | none | `WageTemplatesResponse` |
| Load rules | `GET` | `/wages/rules` | none | `WageRules` |
| Save rules directly | `PUT` | `/wages/rules` | `WageRules & { changeReason: string }` | `WageRules` |
| Create rule request | `POST` | `/wages/rules/requests` | `WageRules & { changeReason: string }` | `WageRuleChangeRequest` |
| Load pending requests | `GET` | `/wages/rules/requests?status=pending` | none | `WageRuleChangeRequest[]` |
| Approve rule request | `POST` | `/wages/rules/requests/:id/approve` | `{}` | `WageRuleChangeRequest` |
| Reject rule request | `POST` | `/wages/rules/requests/:id/reject` | `{ reviewComment: string }` | `WageRuleChangeRequest` |
| Calculate monthly wages | `POST` | `/wages/calculate-monthly` | `{ year: number, month: number }` | `{ count: number, items: WageCalculationItem[] }` |
| Approve calculation | `POST` | `/wages/:id/approve` | `{}` | `WageCalculationItem` |
| Load slip JSON | `GET` | `/wages/:id/slip` | none | `WageSlip` |
| Download CSV | `GET` | `/wages/:id/slip.csv` | none | file response |
| Download PDF | `GET` | `/wages/:id/slip.pdf` | none | file response |

Notes:
- CSV/PDF downloads only send the `Authorization` header; no request body is sent.
- Filename is derived from `content-disposition` with fallback `wage-slip-<id8>.<format>`.
