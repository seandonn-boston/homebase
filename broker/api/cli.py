"""
CLI Demo — interactive command-line interface for the broker platform.

Runs entirely in-process (no HTTP server needed). Demonstrates the full
lifecycle: browse services, connect, watch, disconnect, view bill.
"""

from __future__ import annotations

import sys
import time

from broker.services.bootstrap import bootstrap, Platform


def fmt_cents(cents: float) -> str:
    return f"${cents / 100:.4f}"


def fmt_duration(seconds: float) -> str:
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes = seconds / 60
    if minutes < 60:
        return f"{minutes:.1f}m"
    hours = minutes / 60
    return f"{hours:.1f}h"


def print_services(platform: Platform) -> None:
    """Show all services with availability."""
    print("\n  Available Services")
    print("  " + "-" * 62)
    print(f"  {'Service':<20} {'Cost/mo':<10} {'Slots':<12} {'Queue':<8}")
    print("  " + "-" * 62)

    for svc in platform.store.list_services():
        status = platform.broker.service_status(svc.service_id)
        slots = f"{status['used_slots']}/{status['total_slots']} used"
        queue = str(status["queue_depth"]) if status["queue_depth"] > 0 else "-"
        cost = f"${svc.monthly_cost_cents / 100:.2f}"
        print(f"  {svc.name:<20} {cost:<10} {slots:<12} {queue:<8}")

    print()


def print_billing(platform: Platform, user_id: str) -> None:
    """Show billing summary for a user."""
    bill = platform.billing.user_bill(user_id)
    print(f"\n  Billing Summary for {user_id}")
    print("  " + "-" * 52)
    print(f"  Total usage:  {fmt_duration(bill.total_seconds)}")
    print(f"  Total cost:   {fmt_cents(bill.total_cost_cents)}")
    print(f"  Sessions:     {len(bill.breakdown)}")

    if bill.breakdown:
        print(f"\n  {'Service':<20} {'Duration':<12} {'Cost':<12}")
        print("  " + "-" * 44)
        for r in bill.breakdown:
            svc = platform.store.get_service(r.service_id)
            name = svc.name if svc else r.service_id
            print(f"  {name:<20} {fmt_duration(r.duration_seconds):<12} {fmt_cents(r.cost_cents):<12}")
    print()


def print_platform_summary(platform: Platform) -> None:
    """Show platform-wide economics."""
    summary = platform.billing.platform_summary()
    print("\n  Platform Economics")
    print("  " + "-" * 42)
    print(f"  Services:        {summary['service_count']}")
    print(f"  Monthly cost:    {fmt_cents(summary['total_monthly_cost_cents'])}")
    print(f"  Billed so far:   {fmt_cents(summary['total_billed_cents'])}")
    print(f"  Operating loss:  {fmt_cents(summary['operating_loss_cents'])}")
    print(f"  Cost recovery:   {summary['cost_recovery_pct']:.1f}%")
    print()


def simulate_usage(platform: Platform) -> None:
    """
    Run a simulation: multiple users connect, use services for random
    durations, disconnect. Shows the billing at the end.
    """
    import random

    print("\n  Running usage simulation...\n")

    users = ["user-alice", "user-bob", "user-carol", "user-dave"]
    services = [s.service_id for s in platform.store.list_services()]

    sessions = []

    # Each user connects to 2-3 random services
    for uid in users:
        picks = random.sample(services, k=min(3, len(services)))
        for sid in picks:
            session = platform.broker.request_session(uid, sid)
            if session.state.value == "active":
                sessions.append(session)
                print(f"    {uid} -> {sid}: CONNECTED (session {session.session_id[:8]})")
            else:
                print(f"    {uid} -> {sid}: QUEUED")
                sessions.append(session)

    # Simulate passage of time (we just set started_at in the past)
    for s in sessions:
        if s.started_at:
            s.started_at -= random.uniform(300, 5400)  # 5 min to 1.5 hours ago

    # End all sessions
    print()
    for s in sessions:
        record = platform.broker.end_session(s.session_id)
        if record:
            svc = platform.store.get_service(s.service_id)
            name = svc.name if svc else s.service_id
            print(f"    {s.user_id} ended {name}: "
                  f"{fmt_duration(record.duration_seconds)} = {fmt_cents(record.cost_cents)}")

    # Print bills
    print()
    for uid in users:
        print_billing(platform, uid)

    print_platform_summary(platform)


def interactive(platform: Platform) -> None:
    """Interactive REPL."""
    user_id = "user-alice"  # default user
    active_session = None

    print("\n  Metered Service Broker — Interactive Demo")
    print("  " + "=" * 45)
    print(f"  Logged in as: {user_id}")
    print("  Commands: services | connect <id> | disconnect | billing | platform | simulate | user <id> | quit\n")

    while True:
        try:
            raw = input("  broker> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if not raw:
            continue

        parts = raw.split()
        cmd = parts[0].lower()

        if cmd == "quit":
            break
        elif cmd == "services":
            print_services(platform)
        elif cmd == "connect" and len(parts) > 1:
            service_id = parts[1]
            session = platform.broker.request_session(user_id, service_id)
            if session.state.value == "active":
                active_session = session
                print(f"\n  Connected to {service_id} (session {session.session_id[:8]})")
                print(f"  Credential: {session.credential_id}\n")
            else:
                pos = platform.broker.get_queue_position(session.session_id)
                active_session = session
                print(f"\n  Queued for {service_id} (position {pos})\n")
        elif cmd == "disconnect":
            if active_session:
                record = platform.broker.end_session(active_session.session_id)
                if record:
                    print(f"\n  Disconnected. Duration: {fmt_duration(record.duration_seconds)}, "
                          f"Cost: {fmt_cents(record.cost_cents)}\n")
                active_session = None
            else:
                print("\n  No active session.\n")
        elif cmd == "billing":
            print_billing(platform, user_id)
        elif cmd == "platform":
            print_platform_summary(platform)
        elif cmd == "simulate":
            simulate_usage(platform)
        elif cmd == "user" and len(parts) > 1:
            user_id = parts[1]
            print(f"\n  Switched to user: {user_id}\n")
        else:
            print(f"\n  Unknown command: {raw}\n")


def main() -> None:
    platform = bootstrap()

    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "status":
            print_services(platform)
        elif cmd == "simulate":
            simulate_usage(platform)
        elif cmd == "billing" and len(sys.argv) > 2:
            print_billing(platform, sys.argv[2])
        elif cmd == "platform":
            print_platform_summary(platform)
        else:
            print(f"Unknown command: {cmd}")
            print("Usage: python -m broker.api.cli [status|simulate|billing <user_id>|platform]")
    else:
        interactive(platform)


if __name__ == "__main__":
    main()
