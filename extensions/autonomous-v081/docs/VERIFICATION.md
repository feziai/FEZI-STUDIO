# Verification Matrix — 2026-11-02

Registry includes 35 user-specified GitHub URLs. Exact current tags, license files, maintenance and dependencies are **not independently validated for all 35**; entries are explicitly `not verified` / `requires review`, and disabled by default. No packaged source code from third parties.

Verified public findings:
- anomalyco/opencode: repo advertises MIT.
- Kilo-Org/kilocode: repo advertises MIT, CLI and VSCode/JetBrains.
- stackblitz-labs/bolt.diy: source MIT; production commercial WebContainers may require separate license.
- open-webui/open-webui: modified license imposes branding restrictions.
- n8n-io/n8n: Sustainable Use License; end users building/configuring workflows as hosted product requires commercial license.

Evidence: https://github.com/anomalyco/opencode ; https://github.com/Kilo-Org/kilocode ; https://github.com/stackblitz-labs/bolt.diy ; https://github.com/open-webui/open-webui/blob/main/LICENSE ; https://support.n8n.io/article/can-i-use-your-license-for-my-use-case

To complete verification, capture release tag, commit SHA, LICENSE SHA, maintenance last-push, runtime and dependencies per repo with authenticated GitHub API and review prior to activation.
