"""
Bootstrap — wires up the full broker system with mock data for demo.

Call bootstrap() to get a fully-initialized Platform ready to use.
"""

from __future__ import annotations

from broker.core.billing import BillingEngine
from broker.core.broker import SessionBroker
from broker.core.models import ServiceDefinition, ServiceTier, User
from broker.core.store import Store
from broker.core.vault import CredentialVault
from broker.services.mock_services import MockStreamingService, create_mock_services


class Platform:
    """Container for all broker components — the top-level entry point."""

    def __init__(
        self,
        store: Store,
        vault: CredentialVault,
        billing: BillingEngine,
        broker: SessionBroker,
        mock_services: dict[str, MockStreamingService],
    ) -> None:
        self.store = store
        self.vault = vault
        self.billing = billing
        self.broker = broker
        self.mock_services = mock_services


# --- Service catalog --------------------------------------------------------

SERVICE_CATALOG = [
    ServiceDefinition(
        service_id="mock-netflix",
        name="Mock Netflix",
        monthly_cost_cents=1599,    # $15.99
        max_concurrent_streams=4,
    ),
    ServiceDefinition(
        service_id="mock-hulu",
        name="Mock Hulu",
        monthly_cost_cents=1799,    # $17.99
        max_concurrent_streams=2,
    ),
    ServiceDefinition(
        service_id="mock-disney",
        name="Mock Disney+",
        monthly_cost_cents=1399,    # $13.99
        max_concurrent_streams=4,
    ),
    ServiceDefinition(
        service_id="mock-hbo",
        name="Mock HBO Max",
        monthly_cost_cents=1599,    # $15.99
        max_concurrent_streams=3,
    ),
    ServiceDefinition(
        service_id="mock-spotify",
        name="Mock Spotify",
        monthly_cost_cents=1099,    # $10.99
        max_concurrent_streams=1,
    ),
]

# --- Credentials per service ------------------------------------------------

MOCK_CREDENTIALS = {
    "mock-netflix": [
        ("pool-netflix-1@broker.local", "nf-pass-001", ServiceTier.PREMIUM),
        ("pool-netflix-2@broker.local", "nf-pass-002", ServiceTier.PREMIUM),
    ],
    "mock-hulu": [
        ("pool-hulu-1@broker.local", "hu-pass-001", ServiceTier.STANDARD),
    ],
    "mock-disney": [
        ("pool-disney-1@broker.local", "dp-pass-001", ServiceTier.PREMIUM),
    ],
    "mock-hbo": [
        ("pool-hbo-1@broker.local", "hb-pass-001", ServiceTier.PREMIUM),
    ],
    "mock-spotify": [
        ("pool-spotify-1@broker.local", "sp-pass-001", ServiceTier.BASIC),
        ("pool-spotify-2@broker.local", "sp-pass-002", ServiceTier.BASIC),
        ("pool-spotify-3@broker.local", "sp-pass-003", ServiceTier.BASIC),
    ],
}

# --- Demo users -------------------------------------------------------------

DEMO_USERS = [
    User(user_id="user-alice", username="alice"),
    User(user_id="user-bob", username="bob"),
    User(user_id="user-carol", username="carol"),
    User(user_id="user-dave", username="dave"),
]


def bootstrap() -> Platform:
    """Wire up and return a fully-initialized Platform."""
    store = Store()
    vault = CredentialVault(store)
    billing = BillingEngine(store)
    broker = SessionBroker(store, vault, billing)
    mock_services = create_mock_services()

    # Register services
    for svc in SERVICE_CATALOG:
        store.add_service(svc)

    # Store credentials and register them on mock services
    for service_id, cred_list in MOCK_CREDENTIALS.items():
        mock_svc = mock_services.get(service_id)
        for email, password, tier in cred_list:
            vault.store_credential(service_id, email, password, tier)
            if mock_svc:
                mock_svc.register_account(email, password)

    # Register demo users
    for user in DEMO_USERS:
        store.add_user(user)

    return Platform(
        store=store,
        vault=vault,
        billing=billing,
        broker=broker,
        mock_services=mock_services,
    )
