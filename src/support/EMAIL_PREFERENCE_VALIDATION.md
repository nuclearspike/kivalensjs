# Conditional feedback email — 2026-10-23

A lender can send an idea, bug or language request without email. Selecting **You
may contact me about this report** reveals an **Email address** field and requires
a valid nonblank address. Turning contact off permits sending and omits any
retained address. The journey remains open → write and choose contact → send
(three steps); failures retain the draft, and acceptance closes the form and thanks
the lender.

The previous component explicitly allowed an empty address with contact selected.
It also used the shared optional-email label even though the field was hidden
until contact was selected. The repair adds required email semantics, a 320-character
validation bound, validation for button and keyboard submission, and the neutral
shared key `feedback.email.label`. The field has no HTML `maxlength`: oversized
input stays complete and cannot silently become a different recipient. No-contact payloads omit both valid and malformed stale
addresses.

## Shared copy boundary

The retained `shared-support.json` 1.1.22 snapshot and its lock/hash are unchanged.
The newer shared definition uses a website launcher rather than this embedded
dialog, so replacing the whole snapshot would be a separate migration.

`scripts/sync-support-email-copy.mjs` projects only the neutral email-label role
from canonical `definition/strings.json` into
`shared-email-copy.generated.json`. The generated amendment records canonical
version 1.2.2 and the SHA-256 of the complete source string file. Rendering merges
that single role; the seven canonical locales are imported, while the existing
Italian and Dutch peers use **Indirizzo email** and **E-mailadres**. The old
optional role remains only in the immutable base, not the rendered dialog.

Refresh or verify the amendment with the maintained canonical checkout:

```sh
node scripts/sync-support-email-copy.mjs /path/to/shared-support-and-more-apps
node scripts/sync-support-email-copy.mjs /path/to/shared-support-and-more-apps --check
```

This does not repin an SDK, qualify a package or migrate the support transport.

## Evidence

Evidence is retained in the canonical KivaLens tree under
`analysis/feedback-email-required-20261023/`:

- `baseline.log`: the new interaction regressions failed before production changes
  (**14 failed, 18 passed**). Each submission kind accepted selected/blank contact,
  and every visible locale lacked the neutral label.
- `support-final.log`: **85/85** support and LanguageMenu tests pass, including all
  three kinds, nine locale labels, required semantics without a truncating length cap, blank/whitespace,
  malformed and oversized addresses, keyboard guarding, valid contact payloads and
  anonymous stale-address omission. Existing draft, retry, acceptance, report
  storage and language-menu tests remain passing.
- `maxlength-baseline-unit.log`: the follow-up regression failed for all three kinds
  while the truncating HTML attribute remained. `maxlength-baseline-browser.log`
  reproduced an actual Chromium fill changing a 321-character synthetic recipient
  from a domain ending in `.com` to `.co`.
- `maxlength-final-unit.log` and `maxlength-final-browser.log`: after removing the
  attribute, all 85 focused tests and all four built-page journeys pass. Actual
  browser fill preserves the complete oversized address and blocks button and
  keyboard sending before a later valid-address submission.
- `copy-check.log`, `lint.log`, `typecheck.log`, `build.log`: canonical
  amendment verification, targeted ESLint, TypeScript and production Vite build pass.
- `built-journey.mjs` and `built-journey.log`: headless Chromium exercised the
  actual production build, English Idea/Bug/Language at 1100 pixels and German
  Idea at 390 pixels. Every service and unrelated data request was intercepted.
  Blank, malformed and complete oversized selected addresses blocked sending; a valid address sent
  only to the fake service; turning contact off omitted it. Acceptance closed,
  thanked and reopened a fresh draft. No real report or enrollment was submitted.
  `built-fixture-diagnostic.log` preserves a fixture expectation correction for the
  existing automated-processing disclosure field, not a product failure.
- The generated build directory was removed after verification; source, tests,
  fixture and logs remain. No deployment was performed.

These are focused source and built-page checks. They do not replace the required
commit-specific release gate in `AGENTS.md:14`. Its separate result belongs in
`analysis/feedback-email-required-20261023/release-gate/`; a local task-only commit
and gate run do not authorize push, merge or deployment.

Pattern, experiment and recipe checks pass. The initiative checker reports one
pre-existing malformed `initiative.cloudflare_free_host.originRefs` entry at root
line 214; this unrelated initiative was not rewritten. The scoped structural
check reports no structural errors after generated-output cleanup. These checks
are documentation checks, not native or deployed acceptance.

## Older Lite binary is a separate remaining gate

The ordinary KivaLens Lite default still embeds qualified SDK
`1.7.0-dev.20261017.2`. Its conditional native contact field has the same defect;
publishing either website cannot rewrite that binary. The existing 1.8 launcher
candidate, central qualification and an app update remain the route to completion.
The exact source audit and outstanding gate are recorded in Lite's
`docs/verification/web-support-20261019.md` and
`initiative.localize_theme_and_connect_support`. No native package, pin,
qualification record or release changed in this task.
