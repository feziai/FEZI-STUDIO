# Financial integration contract (not activated)

Never call `deposit` with an order reconstructed from a browser request. Load an immutable server-created order with an authenticated owner, exact atomic units, chain identifier, asset/contract identifier, approved destination and accepted fee basis points. `verifyTransfer` must independently resolve an event from a trusted node/provider, validate the order and asset contract, require chain-specific finality, and return a globally unique chain:transaction:event identifier. This adapter is intentionally absent: no browser screenshot, TXID claim or generic webhook should credit funds.

The library uses SQLite transactions and integer strings; do not change them to floating-point monetary balances. `identityVerified` must come from a server-side approved identity record, never user JSON. `clientId` is an idempotency key. Withdrawal reservation is implemented; signing, approval, confirmation, cancellation and reconciliation are not. Do not enable a production withdrawal endpoint until those transitions exist and are tested.

The notices table is a transactional outbox. A restricted worker may send gross/fee/net/order ID to the owner's verified private Telegram chat. Do not send it through the public Announcement broadcast. Do not include KYC records. Implement acknowledgement, retries and privacy controls before activating it.
