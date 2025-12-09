# HRMS Backend Schema Blueprint

This directory contains the MongoDB collection definitions, validation rules, and indexing strategy that the new backend will use to fully support the existing React front end.

The collections include:

- `users`
- `attendanceRecords`
- `permissions`
- `profileChangeRequests`
- `tasks`
- `workSettings`
- `authTokens`
- `notifications`
- `auditLogs`
- `mediaUploads` (optional if selfies are stored)

Each section below outlines the required fields, indexes, validation rules, and relationships needed by the frontend (attendance, profiles, approvals, reporting, role guards).

## Collection Schemas

### `users`
- `_id`: ObjectId (PK)
- `nik`, `email`, `phone`: strings, unique indexes
- `name`, `role` (`employee|supervisor|manager|owner|hr`), `division`, `department`
- `passwordHash`, `salt`, `status` (`active|inactive`)
- `profileImage`, `cvUrl`, `diplomaUrl`, `address`, `gender`, `dob`
- `leaveBalance`, `performanceScore`, `joinDate`
- `tasks`: array of ObjectId references to `tasks`
- `permissionHistory`: array of ObjectId references to `permissions`
- `createdAt`, `updatedAt`
- Indexes: unique on `email`, `nik`; compound index on `(role, division)`; partial index for `status: active`
- Validation: require `name`, `email`, `role`, `passwordHash`, `status`

### `attendanceRecords`
- `_id`, `userId` (ObjectId -> `users`), `type` (`clock_in|clock_out`)
- `date`, `time`, `timestamp`
- `location`, `coordinates`, `deviceInfo`
- `isLate`, `lateDuration`, `isEarlyLeave`, `reason`
- `photoUrl`, `permissionId` (ObjectId -> `permissions`), `workSettingId` (ObjectId -> `workSettings`)
- `status`: `valid`, `pending`, `rejected`
- Indexes: compound `(userId, date)` for history lookups
- Validation: require `userId`, `type`, `timestamp`

### `permissions`
- `_id`, `userId`, `attendanceId` (optional), `type` (`late|early_leave|other`)
- `note`, `fileUrl`, `durationMinutes`
- `status` (`pending|approved|rejected`), `requestedAt`
- `approvedBy`, `rejectedBy`, `decisionNotes`, `approvedAt`
- `workSettingId`, `division`, `role`
- Indexes: `(userId, status)` compound, text index on `note`
- Validation: require `userId`, `type`, `status`

### `profileChangeRequests`
- `_id`, `userId`, `requestedBy`, `changes` (map), `status`, `division`
- `requestedAt`, `approvedBy`, `approvedAt`, `comments`, `approverRole`
- Indexes: `(userId, status)`
- Validation: require `userId`, `changes`, `status`

### `tasks`
- `_id`, `title`, `description`, `assignedTo`, `assignedBy`, `division`, `priority`
- `status`, `dueDate`, `targetDate`, `score`, `metrics`, `completedAt`, `reviewNotes`
- Validation: require `assignedTo`, `title`, `status`

### `workSettings`
- `_id`, `division`, `shiftName`, `startTime`, `endTime`, `gracePeriod` (minutes)
- `allowedRadiusMeters`, `latitude`, `longitude`, `earlyLeaveDeduction`, `lateTolerance`
- `activeDays` array, `timezone`, `enabled`
- Validation: require `division`, `startTime`, `endTime`

### `authTokens`
- `_id`, `userId`, `refreshToken`, `ip`, `userAgent`, `expiresAt`, `revoked`
- Index: TTL on `expiresAt`

### `notifications`
- `_id`, `userId`, `type`, `status`, `message`, `relatedId`, `createdAt`, `read`
- Validation: require `userId`, `type`, `message`

### `auditLogs`
- `_id`, `action`, `performedBy`, `targetType`, `targetId`, `metadata`, `createdAt`
- Helps trace approvals/critical actions

### `mediaUploads` (optional)
- `_id`, `userId`, `attendanceId`, `url`, `type`, `createdAt`, `expiresAt`
- Use TTL index on `expiresAt`
