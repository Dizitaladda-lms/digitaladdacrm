# DIZITALADDA CRM

## Overview

DIZITALADDA CRM is a production-ready backend built using Node.js, Express.js, and PostgreSQL. The project follows a clean layered architecture with Repository Pattern, Service Layer, JWT Authentication, RBAC, centralized error handling, and Docker support.

---

## Technology Stack

- Node.js
- Express.js
- PostgreSQL
- JWT
- bcrypt
- Express Validator
- Docker

---

## Project Structure

server/
├── config/
├── constants/
├── controllers/
├── middleware/
├── repositories/
├── routes/
├── services/
├── utils/
├── validators/

---

## Installation

npm install

---

## Development

npm run dev

---

## Production

npm start

---

## Docker

docker compose up --build

---

## Environment

Copy `.env.example` to `.env` and update the values.

### Web Push notifications

Push notifications require a VAPID key pair. From the `server` directory, generate
a pair with:

```sh
npx web-push generate-vapid-keys
```

Set the matching `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`
values in `server/.env` for local development. In production, add them as
backend deployment environment variables (for Vercel, in the project's
Environment Variables settings) and redeploy the backend. Keep the private key
secret, and do not rotate the pair after clients have subscribed unless users
will re-subscribe with the new public key.

### Attendance passkeys

Attendance uses server-verified WebAuthn passkeys and requires HTTPS. Set
`CLIENT_URL` to the canonical frontend origin; if `ALLOWED_ORIGINS` contains
additional frontend origins, they must use the same WebAuthn relying-party
domain. Set `WEBAUTHN_RP_ID` only when the relying-party domain differs from
the `CLIENT_URL` hostname.

Before deploying the updated attendance service, run `npm run db:migrate`.
The passkey migration invalidates old client-only biometric registrations.
Each employee must register a device passkey once; registration is immediately
active and does not wait for HR approval. iPhone/iPad registration additionally
creates an encrypted face template using three camera frames with a randomized
head turn. iPhone/iPad attendance requires the passkey and one fresh, centered
camera frame that matches the registered face. Android and other devices use
the platform passkey verification prompt without a camera face check. Configure a private 32-byte hex key
as `ATTENDANCE_FACE_ENCRYPTION_KEY` before enabling iPhone/iPad face registration (generate
one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
Keep this key in the backend secret manager and back it up securely; rotating it
means existing face templates can no longer be decrypted and employees must
re-register after an HR reset.

Face embeddings are encrypted at rest. iPhone/iPad camera frames are processed
by the backend for face match and anti-spoof/liveness scoring, then discarded.
The registration head-turn and attendance liveness checks reduce simple photo replay but are not a
certified liveness guarantee. Self-registration binds the face seen at
registration to the signed-in employee account; it does not independently
prove the employee's legal identity. HR biometric reset deletes the passkey
and face template. Mobile-data attendance remains enabled; client-reported GPS
coordinates are still not a server-verifiable location signal.

---

## Features

- JWT Authentication
- RBAC
- Lead Management
- Employee Management
- Course Management
- Department Management
- PostgreSQL
- Docker Ready
- Environment Validation
- Global Error Handling

---

## License

Private Project