The public contact form posts to `/api/contact` without requiring an account or database. Messages are sent through the Resend HTTPS API to `reservations@chaletdelapointe.com`, with the visitor's address as `reply_to`.

Server-only configuration:

- `RESEND_API_KEY`: preferred sending credential. If absent, the existing `SMTP_URL` credential is reused only when its host is `smtp.resend.com` and its user is `resend`.
- `CONTACT_EMAIL_FROM`: optional verified sender; defaults to the existing `BOOKING_EMAIL_FROM`.
- `CONTACT_EMAIL_TO`: optional recipient override for local testing; production defaults to `reservations@chaletdelapointe.com`.

The browser retains the same request ID when retrying unchanged fields. Resend idempotency keys include that ID and a hash of the actual email, so retries cannot produce duplicate messages during Resend's idempotency window. Success is displayed only after Resend accepts the email. A failed request keeps the visitor's fields available for retry.

Validation, a honeypot and same-origin checks reject invalid submissions. A bounded, in-memory rate limit allows five attempts per IP per ten minutes on each server instance; it is burst protection, not a distributed quota across serverless instances. No visitor email, message or API key is logged.

Run `node artifacts/api-server/scripts/test-contact.mjs` from the workspace root. These tests stub only Resend; they exercise the actual HTTP route and send no real emails. For a live delivery check, use Resend's `delivered@resend.dev` test recipient in an isolated local environment, never as the production recipient.
