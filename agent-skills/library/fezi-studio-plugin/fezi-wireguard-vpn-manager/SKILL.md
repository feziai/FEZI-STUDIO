---
name: fezi-wireguard-vpn-manager
description: Plan and operate a lawful WireGuard VPN on a server the user controls.
---

# Fezi Wireguard Vpn Manager — FEZI Studio

## Execution checklist
1. Confirm server ownership and intended administrative use.
2. Prefer WireGuard with SSH hardened, current security patches and a private subnet not conflicting with existing networks.
3. Generate fresh server/peer keys ONLY on authorized destination machines; never place private keys inside plugin ZIP, source, chat or logs.
4. Configure ListenPort, firewall and NAT as needed. Do not break existing management access; prepare console rollback.
5. Add each peer with narrow AllowedIPs and revocation/rotation instructions.
6. Validate handshake, DNS leak behavior, IPv4/IPv6 routing and firewall exposure from the real server before marking operational.
7. No assertion of anonymity, free bandwidth, bypassed service protections or active server until tested.
Reference: https://www.wireguard.com/quickstart/ .

## Evidence contract
- Classify the result as PLANNED, PATCH_READY, LOCALLY_TESTED, CONNECTED, or VERIFIED_LIVE.
- Return exact source target, tests, logs or remote reference and blockers.
- The skill cannot provide itself with account authorization, remote access, hosting, model weights, or payment.
