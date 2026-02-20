# API Contract (MVP)

## Auth
- `POST /auth/login`
- `POST /auth/mfa/verify`
- `POST /auth/refresh`
- `POST /auth/logout`

## Staff Users
- `GET /staff-users`
- `POST /staff-users`
- `PATCH /staff-users/:id`
- `PATCH /staff-users/:id/roles`

## Service Users
- `GET /service-users`
- `POST /service-users`
- `PATCH /service-users/:id`
- `PATCH /service-users/:id/status`

## Support Plans / Records
- `GET/POST/PATCH /support-plans`
- `GET/POST/PATCH /support-records`

## Shifts
- `GET /shifts`
- `POST /shifts`
- `PATCH /shifts/:id`
- `POST /shifts/bulk`

## Attendance
- `POST /attendance/clock-in`
- `POST /attendance/clock-out`
- `GET /attendance`

## Attendance Corrections
- `POST /attendance-corrections`
- `POST /attendance-corrections/:id/approve`

## Wages
- `POST /wages/calculate-monthly`
- `POST /wages/:id/approve`
- `GET /wages/templates`
- `GET /wages/:id/slip`
- `GET /wages/:id/slip.csv`
- `GET /wages/:id/slip.pdf`

## User Portal
- `GET /me/attendance-summary`
- `GET /me/wage-summary`
- `GET /me/support-summary`

## OpenAPI
- `GET /api-docs` (Swagger UI)
- `GET /api-docs-json` (OpenAPI JSON)

## Error Response (共通)
APIエラー時は原則以下の形式で返却する。

```json
{
  "statusCode": 400,
  "message": "invalid_request",
  "error": "BadRequestException",
  "code": "P2002",
  "timestamp": "2026-02-20T05:30:00.000Z",
  "path": "/wages/calculate-monthly"
}
```

- `code` は任意（主にPrismaエラー時）
- `message` は `string` または `string[]`
