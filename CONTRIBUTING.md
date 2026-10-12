# Contributing to CYNDY

Thank you for helping build a focused, offline-first counter.

## Before making a change

1. Read the active OpenSpec proposal, specifications, design, and tasks.
2. Keep one reviewable behavior or governance outcome per change.
3. Do not add authentication, cloud sync, backup, export/import, currency conversion, reconciliation, or register-closing workflows unless an approved specification introduces them.

## Data and secret safety

- Use synthetic fixtures only.
- Never commit `.env` files, credentials, tokens, private keys, production exports, screenshots containing personal information, or real user data.
- `.env.example` documents names and safe placeholders only. CYNDY v1 currently requires no variables.
- If sensitive material is committed, stop sharing the branch, rotate the affected credential, and follow `SECURITY.md`.

## Quality expectations

- Include focused verification with the change it proves.
- Keep documentation synchronized with user-visible or operational behavior.
- Keep the static build host-portable and free of proprietary runtime APIs.
- Prefer small changes that can be reverted without removing unrelated work.

## Pull requests

Describe the outcome, scope, verification evidence, rollback boundary, and anything intentionally left for a later work unit. Repository maintainers will configure required reviews and checks before public release.
