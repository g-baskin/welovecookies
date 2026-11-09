# Glossary

One name per idea. When docs or law sources use another word, it is listed in brackets with the name used here and in the code.

| Term | In code | Meaning |
| --- | --- | --- |
| **Region mode** | `ConsentMode`, config `mode` | The set of consent rules for a visitor's location. One of `opt-in`, `opt-in-uk`, `opt-in-light`, `opt-out-gpc`, `opt-out`, `notice`. The config value `'auto'` means "pick it from the browser's time zone". Not the same as Google Consent Mode. |
| **Ask-first** (opt-in) | modes `opt-in`, `opt-in-uk`, `opt-in-light` | Nothing optional runs until the visitor answers. Full banner. |
| **Opt-out** | modes `opt-out-gpc`, `opt-out` | Optional categories run by default; the visitor can switch them off. Short notice banner with a "Do Not Sell or Share" link. `opt-out-gpc` is where the law requires honouring GPC. |
| **Notice-only** | mode `notice` | No consent law; no banner by default. |
| **Mode rule** | `MODE_RULES`, `ModeRule` | What a region mode does: whether it is ask-first, which banner, the defaults before a choice, whether GPC is required, the Do Not Sell link, how long a choice lasts. |
| **Category** | `CONSENT_CATEGORIES` | A group of cookies and tags the visitor can allow: `necessary` (always on), `preferences`, `analytics`, `marketing`. [functional = preferences; statistics = analytics; ads/advertising = marketing] |
| **Grants** | `Grants` | Which optional categories are on right now (`preferences`, `analytics`, `marketing`, each true or false). |
| **Choice** | `StoredConsent` | A visitor's saved decision: consent id, time, region mode, revision, grants and action. Kept in the consent cookie. [consent record when stored on a server] |
| **Action** | `ConsentAction` | How a choice was made: `accept_all`, `reject_all`, `custom` (saved from the preferences panel), `acknowledge` ("OK" on a notice), `withdraw` (switched everything off after allowing something), `gpc` (recorded automatically when Global Privacy Control turned marketing off). |
| **Banner** | `bannerFor()`, `'full' \| 'notice'` | The first layer. `full`: Accept all, Reject all, Choose. `notice`: OK, Choose, Do Not Sell or Share. [Customize = Choose] |
| **Preferences panel** | `openPreferences()`, `preferencesTitle` | The second layer, with a switch per category. Opened by **Choose**, the cookie button or a "Cookie settings" link. Not the same as the `preferences` category. [settings panel, cookie settings] |
| **Preferences category** | `'preferences'`, config `preferencesCategory` | The optional category for remembered display settings. Hidden unless `preferencesCategory` is on. |
| **Revision** | `rev` | The banner version. Raising it asks everyone again. |
| **Consent cookie** | `CONSENT_COOKIE_NAME` (`wlc_consent`) | The first-party cookie holding the choice, in the fixed format in `cookie.ts`. |
| **GPC** | `gpc` | Global Privacy Control, the browser's opt-out signal. It always turns marketing off. |
| **Signals** | `signals.ts`, `ConsentIntegrations` | The consent state passed to vendors: Google Consent Mode v2, Microsoft UET consent, Meta, TikTok, PostHog. "Google Consent Mode" always means Google's API, never a region mode. |
| **Script blocking** | `data-consent`, `activateScripts()` | `<script type="text/plain" data-consent="...">` tags that only run once their category is allowed. |
| **Auto-clear** | `autoclear.ts`, config `autoClear` | Deleting known tracking cookies as soon as their category is off. |
| **Record endpoint** | `endpoints.record`, `ConsentRecordPayload` | Your own address that receives each choice as JSON, to keep proof of consent. |
| **Seen endpoint** | `endpoints.seen`, `ConsentSeenPayload` | Optional address counting banner views, without cookies. |
| **Hosted install** | `data-site`, `HOSTED_CONFIG_PATH` | Loading the config for a site key from the server that serves the script. |
| **All-party-consent state** | `ALL_PARTY_CONSENT_STATES` | A US state whose wiretap law needs every party's consent. There, an **identifying tag** (one that identifies visitors or records sessions) needs an explicit Accept: `mayLoadIdentifyingTag()`. |

Decisions behind these rules: [docs/decisions/](docs/decisions/).
