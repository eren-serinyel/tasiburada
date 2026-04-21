# Tasiburada Platform Policy - Phase 1

Decision: **Strict Model B now, escrow later**.

Tasiburada acts as a protected marketplace during Phase 1. The platform owns the match, keeps pre-job communication inside the product, and reveals direct contact only when operationally necessary.

## Phase 1 Rules

- Revenue stance: hybrid subscription + matched-job fee until payment escrow exists.
- Public listing: carriers see customer as a masked display name and city/district only.
- Open address: visible only to the assigned carrier after direct contact is eligible.
- Offer stage: customer can compare carrier profile, rating, verification and price; carrier phone/email is hidden.
- Accepted offer: platform message path remains primary; phone is still hidden.
- T-24 / in-transit: assigned customer and carrier may see direct phone contact.
- Completed/cancelled: direct contact is not newly exposed by the platform.

## Anti-Bypass Enforcement

- Shipment details, notes and offer messages are scanned for phone numbers, email, URLs, messaging app handles and direct-contact keywords.
- Detected contact info is blocked and recorded in `contact_filter_logs` with a hash and matched rule names, not raw PII.
- Matched shipments cancelled after 48 hours create a 30-day `match_cooldowns` pair for that customer and carrier, unless the reason indicates mutual agreement.
- Active cooldowns prevent the same customer/carrier pair from being matched again.

## Escrow Trigger

Phase 2 starts when the platform reaches 500+ completed shipments per month. At that point, payment flow should move to deposit or full escrow through a licensed payment provider.
