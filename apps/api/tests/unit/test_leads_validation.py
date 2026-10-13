from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.leads import CONSENT_VERSION, ContactSubmission, DemoSubmission, LeadUpdate, phone


@pytest.mark.parametrize(
    "value", ["09123456789", "۰۹۱۲۳۴۵۶۷۸۹", "٠٩١٢٣٤٥٦٧٨٩", "+98 (912) 345-6789", "00989123456789"]
)
def test_telephone_normalization(value):
    assert phone(value) == "+989123456789"


@pytest.mark.parametrize(
    "value", ["123", "+441234567890", "0912abc6789", "091234567890", "<script>"]
)
def test_telephone_rejects_invalid_input(value):
    with pytest.raises(ValueError):
        phone(value)


def test_contact_error_is_field_specific_and_name_blank_is_rejected():
    common = dict(
        full_name="Test person",
        consent=True,
        consent_version=CONSENT_VERSION,
        form_token="x" * 60,
        idempotency_key=uuid4(),
    )
    with pytest.raises(ValidationError) as error:
        ContactSubmission(
            **common,
            contact_method="email",
            contact_value="bad@",
            subject="Test",
            message="Message",
        )
    assert error.value.errors()[0]["loc"] == ("contact_value",)
    with pytest.raises(ValidationError):
        DemoSubmission(**{**common, "full_name": "  "}, phone="09123456789", school_name="Test")


def test_closing_requires_an_explicit_outcome():
    with pytest.raises(ValidationError):
        LeadUpdate(status="closed")
    with pytest.raises(ValidationError):
        LeadUpdate(status="new", outcome="won")
    assert LeadUpdate(status="closed", outcome="won").outcome == "won"
