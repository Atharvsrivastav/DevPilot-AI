# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Use GitHub's private vulnerability reporting:

1. Open the repository's **Security** tab.
2. Select **Report a vulnerability**.
3. Include the affected component, reproduction steps, impact, and any
   suggested fix.

You should receive an acknowledgement within a few business days. Please allow
time for a fix and coordinated disclosure before publishing details.

## Supported versions

Security fixes are applied to the `main` branch. Older forks and deployments are
responsible for applying updates themselves.

## Deployment expectations

- Set `ENVIRONMENT=production`, a random `JWT_SECRET_KEY` of at least 32
  characters, and `ALLOW_DEMO_AUTH=false`.
- Keep `ALLOW_PRIVATE_REPOS=false` until per-user GitHub authorization is
  implemented.
- Terminate TLS at the edge and configure `CORS_EXTRA_ORIGINS` and
  `FRONTEND_URL` for the deployed frontend.
- Never commit `.env` files or provider API keys. Rotate any credential that
  has ever been committed.
