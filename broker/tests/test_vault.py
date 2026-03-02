"""Tests for the credential vault."""

from broker.core.models import CredentialState, ServiceTier
from broker.core.store import Store
from broker.core.vault import CredentialVault


def make_vault() -> CredentialVault:
    return CredentialVault(Store(), master_key="test-key")


def test_store_and_reveal():
    store = Store()
    vault = CredentialVault(store, master_key="test-key")
    cred = vault.store_credential("svc1", "a@b.com", "secret123", ServiceTier.PREMIUM)

    revealed = vault.reveal_password(cred.credential_id)
    assert revealed == "secret123"


def test_checkout_checkin():
    store = Store()
    vault = CredentialVault(store, master_key="test-key")
    cred = vault.store_credential("svc1", "a@b.com", "pass", ServiceTier.BASIC)

    # BASIC = 1 stream max
    checked = vault.checkout(cred.credential_id)
    assert checked is not None
    assert cred.active_sessions == 1

    # Second checkout should fail (at capacity)
    checked2 = vault.checkout(cred.credential_id)
    assert checked2 is None

    # Checkin frees a slot
    vault.checkin(cred.credential_id)
    assert cred.active_sessions == 0

    # Now checkout works again
    checked3 = vault.checkout(cred.credential_id)
    assert checked3 is not None


def test_disable_credential():
    store = Store()
    vault = CredentialVault(store, master_key="test-key")
    cred = vault.store_credential("svc1", "a@b.com", "pass", ServiceTier.PREMIUM)

    vault.disable_credential(cred.credential_id)
    assert cred.state == CredentialState.DISABLED
    assert cred.has_capacity is False

    # Checkout should fail on disabled cred
    checked = vault.checkout(cred.credential_id)
    assert checked is None


def test_rotate_password():
    store = Store()
    vault = CredentialVault(store, master_key="test-key")
    cred = vault.store_credential("svc1", "a@b.com", "old-pass", ServiceTier.PREMIUM)

    assert vault.reveal_password(cred.credential_id) == "old-pass"

    vault.rotate_password(cred.credential_id, "new-pass")
    assert vault.reveal_password(cred.credential_id) == "new-pass"


def test_available_credentials():
    store = Store()
    vault = CredentialVault(store, master_key="test-key")
    c1 = vault.store_credential("svc1", "a@b.com", "p1", ServiceTier.BASIC)
    c2 = vault.store_credential("svc1", "b@b.com", "p2", ServiceTier.BASIC)

    available = vault.available_credentials("svc1")
    assert len(available) == 2

    vault.checkout(c1.credential_id)
    available = vault.available_credentials("svc1")
    assert len(available) == 1
    assert available[0].credential_id == c2.credential_id
