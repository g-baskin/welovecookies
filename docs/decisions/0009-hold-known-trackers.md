# 0009. Hold known trackers that other scripts add, on by default

Date: 2026-11-10

## Status

Accepted.

## Context

Until 1.2.0 the banner held back only scripts the owner had rewritten as `<script type="text/plain" data-consent>`. Most sites load trackers another way: a tag manager or a plugin adds Hotjar, Clarity or the LinkedIn tag after the page loads. Those ran before the visitor answered, even in ask-first regions, and owners rarely notice. Google, Meta, TikTok, Microsoft UET and PostHog were already controlled through their consent signals.

Two approaches are common. Watching the page with a `MutationObserver` catches scripts written in the HTML in time, but a script added by code starts loading the moment it is inserted, before any observer runs. Hooking `document.createElement` (as the open-source `yett` library does) catches those, at the cost of touching a browser built-in.

## Decision

`src/lib/consent/trackers.ts` holds a short, fixed list of well-known tracker hosts (`KNOWN_TRACKERS`) until their category is allowed, plus any hosts the owner lists in `blockScripts`. It does both: it wraps `document.createElement` for `<script>` elements only (instance-level `src`, `type` and `setAttribute` traps) and watches the document for added `<script src>`. A matching script becomes the existing held shape (`type="text/plain"`, `data-consent`, `data-src`), so the URL is never set and nothing downloads before consent. When the category is allowed, the held script is restored in place (type, then `src`). The browser then runs it only if it would have run it without us: a `<script>` set through `innerHTML` stays inert, so holding never turns markup that could not run into a running vendor script.

It is on by default (`integrations.knownTrackers`, default `true`) and can be turned off per site or in the admin. Vendors with consent signals stay off the list: holding gtag would turn Google's advanced consent mode into basic mode. On a hosted install, holding starts with everything denied until the site's config arrives.

## Consequences

**Positive:**
- Listed trackers added by tag managers and plugins wait for consent with no change to the owner's site.
- Scripts added by code make no request at all before consent.

**Negative:**
- Existing sites change behaviour on upgrade (including CDN URLs that follow `main`): in ask-first regions, listed trackers now wait for consent. Released as a minor version with a changelog note and an off switch.
- The banner patches `document.createElement` on the page. It touches only `<script>`, fails open with one console warning when a property cannot be trapped, and restores the original when stopped if nothing else has wrapped it since.
- Only scripts added after the banner script runs can be held, so it must load first. Scripts written in the HTML may still be downloaded by the browser's preload scanner, though they do not run; owners should keep using `type="text/plain"` for their own tags.
- A script element that bypasses `createElement` (another document, `cloneNode`, setters taken from the prototype) and is added by code has already started when the observer sees it, so it is not held. Holding is a safety net, not a guarantee.
- The list needs upkeep, kept in step with the auto-clear list. The banner grew by about 1.6 KB gzipped.

**Neutral:**
- The US wiretap rule (session recorders needing an explicit Accept in all-party-consent states) is still the buyer's `mayLoadIdentifyingTag()` call; this list follows the category grants only.
