# Metered Service Broker

A proof-of-concept platform for metered, fair-split access to pooled service subscriptions.

> **Framework link:** This PoC implements the Resource Broker pattern described in [Admiral Section 40 — Paid Resource Authorization](../aiStrat/admiral/part11-protocols.md) (credential vaulting, session management, fair-split billing).

## What This Is

An experiment in the **infrastructure** required to broker shared access to subscription services
with per-second usage billing, credential vaulting, concurrency management, and fair cost splitting.

This demo runs against **mock services only** — no real streaming platforms are involved.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   User CLI   │────▶│  API Server   │────▶│  Session Broker  │────▶│ Mock Services │
└─────────────┘     └──────┬───────┘     └────────┬────────┘     └──────────────┘
                           │                      │
                    ┌──────▼───────┐     ┌────────▼────────┐
                    │ Billing Eng. │     │ Credential Vault │
                    └──────────────┘     └─────────────────┘
```

### Components

- **Credential Vault** — Encrypted storage for pooled service credentials. Handles checkout/checkin
  of credentials with lock management so two users never collide on the same account.
- **Session Broker** — Manages concurrency slots per service. Routes users to available credentials.
  Queues users when all slots are occupied. Enforces max session duration.
- **Billing Engine** — Per-second usage metering. Calculates each user's fair share of the monthly
  subscription cost based on actual usage. No upcharge — cost is split proportionally.
- **Mock Services** — Simulated streaming services with concurrent session limits, for demo purposes.

## Usage

```bash
python -m broker.api.server              # Start the API server
python -m broker.api.cli status          # Check available services
python -m broker.api.cli connect netflix # Connect to a mock service
python -m broker.api.cli billing         # View your usage and bill
```

## Running Tests

```bash
python -m pytest broker/tests/ -v
```
