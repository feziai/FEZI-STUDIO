---
name: fezi-scholar-research
description: Find and critically examine academic articles using authorized search APIs and verifiable DOI/citation evidence, without copying Scholar GPT's proprietary implementation.
---
# FEZI Scholar Research | پژوهش علمی

Use when someone asks to find, evaluate, compare or summarize academic literature, scholarly PDFs, methodology, or evidence. This skill implements original research workflows inspired by publicly described capabilities of Scholar GPT; it does not call or clone that GPT by default.

1. Convert the user's question into search concepts, synonyms, date range and inclusion criteria. Preserve the original language for reporting; use English queries when scholarly indexing benefits.
2. Choose available authorized connectors/tools. Preferred verifiable public sources: OpenAlex works API, Semantic Scholar Academic Graph API, Crossref DOI metadata; add PubMed/Europe PMC/arXiv where pertinent. Apply terms, costs, rate limits and publisher access requirements. Never scrape logged-in Google Scholar/JSTOR or bypass paywalls.
3. Retrieve identifiable papers with title, authors, year, DOI or stable repository identifier, publication venue, URL, abstract status and open-access status. Cross-check DOI/metadata through the Crossref REST API or the publisher's canonical page when available.
4. Deduplicate using normalized DOI first, stable IDs second, then title/year; identify preprints vs peer-reviewed papers, retractions or corrections, and conflicting findings. A DOI alone does not prove study quality.
5. Read accessible abstracts or legitimate full text. Disclose which one was available; never claim to have read a full text when only an abstract was seen. Don't invent citations or source counts.
6. Return a structured evidence table: paper, year, question, study design, sample size if verified, relevant finding, limitations, DOI/stable link, and source-access level. Separate reported findings from your own synthesis. Flag uncertainty, bias and publication status.
7. For user-uploaded PDFs use authorized file-reading tools and cite the provided document; do not assume the contents.
8. With a deployed MCP Apps server, display search cards, literature table and knowledge graph as a UI resource. The backend must own persisted libraries, permissions and citations. A local mock UI is not a live integration.
9. Save collection history only when explicitly authorized and storage exists. For tasks across FEZI plugins, send only approved research references through the shared skill bus, not copyrighted PDFs or secrets.

**Tests:** searchable DOI; zero results; non-existent DOI; duplicate between OpenAlex/S2; retracted paper; paywalled paper; rate-limited API; conflicting abstracts; missing full text. Prefer sources and calibrated confidence to polished but unfounded summaries.

**Independent design:** Scholar GPT is third-party. Public descriptions do not authorize copying its private instructions, backend APIs or branding. Link to it only as a separate product when appropriate.

See `references/FEZI_SHARED_VIDEO_SCHOLAR_REGISTRY.json`.
