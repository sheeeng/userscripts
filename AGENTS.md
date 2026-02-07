# AGENTS

## Writing Style

- Ensure adherence to Chicago Manual of Style by maintaining correct grammar and using proper punctuation in all comments and documentation.
- Follow Chicago Manual of Style capitalization conventions.
    - Use title case (headline style) for headings, titles, and section names.
    - Use sentence case (sentence style) for regular comments, descriptions, and explanatory text.
    - Always capitalize proper nouns regardless of context.
- Apply accurate grammar and proper punctuation throughout code documentation.
- For title case, apply these Chicago Manual of Style rules.
    - Always capitalize the first and last words.
    - Capitalize all nouns, pronouns, verbs, adjectives, and adverbs.
    - Lowercase articles such as a, an, the.
    - Lowercase coordinating conjunctions such as and, but, or, for, nor, so, yet.
    - Lowercase prepositions such as at, by, for, from, in, into, of, on, to, with, between, through.
    - Lowercase "to" in infinitives such as to run, to see, to build.
    - Exception: Capitalize prepositions when used adverbially or adjectivally ("Look Up," "Turn Down") or in verb phrases.

## Commands

- Use GNU-style explicit arguments over abbreviated ones. Example: Use `date --universal +"%Y-%m-%dT%H:%M:%SZ"` over `date -u +"%Y-%m-%dT%H:%M:%SZ"`. Use `set -o errexit` over `set -e` in shell scripts.
- Save suggested commands in [docs/commands.md](./docs/commands.md).

## Journals

- Use ISO8601 timestamps in journals. Example: `2024-01-31T13:45:00Z`.
- Use 20240131T134500Z-style timestamps as name for the journal files. Example: `20240131T134500Z.md`.
- Read all journals inside [docs/journals](docs/journals) directory for historical context.
- Save summaries in [docs/journals](docs/journals) directory.
- Conform to Markdown linting rules in journals.
- Do not use fully qualified paths in journals. Example: Use `~` or `${HOME}` instead of hardcoded `/home/USERNAME`.
- Do not include any Personally Identifiable Information (PII) or sensitive information in journals. Example: Do not include usernames, email addresses, IP addresses, or any other information that could be used to identify individuals.

## Markdown

- Use [reference-style links][reference-style-links].

---

[reference-style-links]: https://www.markdownguide.org/basic-syntax#reference-style-links
