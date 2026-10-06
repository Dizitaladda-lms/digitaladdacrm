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