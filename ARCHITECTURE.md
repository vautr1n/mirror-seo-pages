# Mirror — Deployment Architecture

Last updated: 2026-04-15

## Overview

Mirror's marketing site is split across **2 active GitHub repos**, each connected to a **Cloudflare Pages project** that auto-deploys on push to `main`.

## Repos

| GitHub repo | Serves | Local source (non-git) | Local clone (git) |
|---|---|---|---|
| `vautr1n/mirror-seo-pages` | `bymirror.ai/*` — everything under the root domain | `~/Documents/Projets/Mirror-Dopel/Mirror/mirror-seo-pages/` | `~/mirror-seo-pages-repo/` |
| `vautr1n/mirror-openclaw-landing` | `openclaw.bymirror.ai/*` — the OpenClaw subdomain | `~/Documents/Projets/Mirror-Dopel/Mirror/deploy-openclaw/` | `~/deploy-openclaw-repo/` |
| `vautr1n/mirror-context-resurrector-landing` | **Nothing — zombie repo**, created by mistake 2026-04-15, to be deleted | `~/Documents/Projets/Mirror-Dopel/Mirror/deploy-context-resurrector/` (the pages now live in `mirror-seo-pages/raw/`) | none |

## Source → clone → remote → live flow

```
~/Documents/Projets/Mirror-Dopel/Mirror/<dir>/   (edit here — NOT a git repo)
    │
    │  rsync -a --delete --exclude=.git --exclude=.DS_Store
    ▼
~/<dir>-repo/                                    (git clone — this IS the git repo)
    │
    │  git add / commit / push
    ▼
github.com/vautr1n/<repo>                        (remote)
    │
    │  Cloudflare Pages webhook on push to main
    ▼
bymirror.ai / openclaw.bymirror.ai               (live, 1-3 min after push)
```

The source dirs under `Mirror/` are **not git repositories**. They are working copies that get rsynced to the paired `~/<name>-repo/` clones, which hold `.git/`. This separation was deliberate to keep large non-versioned assets (pptx, docx, PDFs, screenshots) out of the git tree.

## `mirror-seo-pages` build system

```
mirror-seo-pages/
├── waitlist.html              ← homepage source (copied to / and /waitlist at build time, canonical rewritten for each)
├── template.html              ← template for all MD-built SEO pages, contains GA4 snippet
├── build.js                   ← Node script: MD → HTML + raw copy + sitemap/robots/og copy
├── package.json               ← defines `npm run build`
├── pages/                     ← markdown SEO content — get piped through template.html
│   ├── blog/*.md              →  bymirror.ai/blog/<slug>
│   ├── use-case/*.md          →  bymirror.ai/use-case/<slug>
│   ├── vs/*.md                →  bymirror.ai/vs/<slug>
│   ├── for/*.md               →  bymirror.ai/for/<slug>
│   └── integrations.md        →  bymirror.ai/integrations
├── raw/                       ← standalone HTML landings — copied as-is, bypass template.html
│   ├── ai-forgets/index.html          →  bymirror.ai/ai-forgets
│   ├── cross-tool-memory/index.html   →  bymirror.ai/cross-tool-memory
│   ├── meeting-prep/index.html        →  bymirror.ai/meeting-prep
│   ├── personal-ai-memory/index.html  →  bymirror.ai/personal-ai-memory
│   └── switch/index.html              →  bymirror.ai/switch
├── og/                        ← social share images, copied to dist/og/
├── sitemap.xml                ← copied to dist/sitemap.xml
└── robots.txt                 ← copied to dist/robots.txt
```

Cloudflare Pages runs `npm run build` and serves the contents of `dist/`.

### Two kinds of pages — pick the right one

| Page type | Source | Template | Tracking | Use for |
|---|---|---|---|---|
| **SEO content** | `pages/<section>/<slug>.md` (markdown + frontmatter) | `template.html` — minimal design, generic CTA | GA4 only | Blog posts, comparison pages, use-case pages — anything where content is the point |
| **Paid ad landing** | `raw/<slug>/index.html` (full HTML) | None — copied as-is | GA4 + Google Ads `AW-18066065136` conversion tag + Loops.so form + UTM hidden fields + custom funnel events (scroll_50, cta_visible, form_focus) | Google Ads campaign destinations — anywhere you're buying clicks |

**Don't convert paid landings to MD.** They need custom design, conversion tracking, and the Loops.so form — the MD template doesn't support any of that (it uses a placeholder `formspree.io/YOUR_FORM_ID` that's never been wired up).

## `mirror-openclaw-landing` build system

No build step. Cloudflare Pages serves the repo's files directly.

```
mirror-openclaw-landing/
├── index.html                 →  openclaw.bymirror.ai/
├── blog/*.html                →  openclaw.bymirror.ai/blog/<slug>.html
├── sitemap.xml
└── (og images, etc.)
```

## URL routing on `bymirror.ai`

| Path | Served by | Source file |
|---|---|---|
| `/` | `mirror-seo-pages` | `waitlist.html` (canonical rewritten to `/`) |
| `/waitlist` | `mirror-seo-pages` | `waitlist.html` |
| `/blog/<slug>` | `mirror-seo-pages` | `pages/blog/<slug>.md` |
| `/use-case/<slug>` | `mirror-seo-pages` | `pages/use-case/<slug>.md` |
| `/vs/<slug>` | `mirror-seo-pages` | `pages/vs/<slug>.md` |
| `/for/<slug>` | `mirror-seo-pages` | `pages/for/<slug>.md` |
| `/integrations` | `mirror-seo-pages` | `pages/integrations.md` |
| `/ai-forgets` | `mirror-seo-pages` | `raw/ai-forgets/index.html` |
| `/cross-tool-memory` | `mirror-seo-pages` | `raw/cross-tool-memory/index.html` |
| `/meeting-prep` | `mirror-seo-pages` | `raw/meeting-prep/index.html` |
| `/personal-ai-memory` | `mirror-seo-pages` | `raw/personal-ai-memory/index.html` |
| `/switch` | `mirror-seo-pages` | `raw/switch/index.html` |
| `/og/*.png` | `mirror-seo-pages` | `og/*.png` |
| **Any other path** | Cloudflare SPA fallback | Returns `waitlist.html` (same bytes as `/`) |

The SPA fallback means mistyped paths silently serve the homepage — useful as a soft 404, but it also hides routing bugs. If you think a new page is live but it looks identical to the homepage, the route doesn't exist.

## URL routing on `openclaw.bymirror.ai`

| Path | Source file |
|---|---|
| `/` | `index.html` |
| `/blog/` | `blog/index.html` |
| `/blog/openclaw-ban-explained.html` | `blog/openclaw-ban-explained.html` |
| `/blog/openclaw-alternatives.html` | `blog/openclaw-alternatives.html` |
| `/blog/artificial-personal-intelligence.html` | `blog/artificial-personal-intelligence.html` |

## Analytics & tracking

| Tag | ID | Where it fires |
|---|---|---|
| **Google Analytics 4** | `G-0LDZDKP6XZ` | Everywhere — homepage, `/waitlist`, all MD-built pages (via `template.html`), all 5 `raw/` landings, all `mirror-openclaw-landing` pages |
| **Google Ads conversion** | `AW-18066065136` | Only on paid landing pages: the 5 `raw/` pages + `openclaw.bymirror.ai/*` pages |
| **Funnel events** | `scroll_50`, `cta_visible`, `form_focus` | Only on the 5 `raw/` landings (custom JS at bottom of each file) |

Lead capture:
- **`raw/` landings and `openclaw` pages** → Loops.so form `https://app.loops.so/api/newsletter-form/cmnlu7ayg07z00iwlsnoqwfv7` with UTM hidden fields
- **MD-built pages (template.html)** → ⚠️ still wired to `formspree.io/YOUR_FORM_ID` placeholder, **form submissions go nowhere**. Fix: replace with the Loops.so endpoint or remove the form from the template.

## Workflow for future changes

### Adding a new SEO content page (blog, use-case, vs, for)
1. Create `pages/<section>/<slug>.md` in source with frontmatter (`title`, `description`, `keywords`, `og_title`, `og_description`)
2. Update `sitemap.xml` with the new URL
3. rsync → clone → commit + push
4. Cloudflare rebuilds automatically

### Adding a new paid ad landing page
1. Drop the full HTML as `raw/<slug>/index.html` in source
2. Make sure GA4 + AW-18066065136 + Loops.so form + UTM fields are in the HTML
3. rsync → clone → commit + push

### Editing the homepage / waitlist
1. Edit `waitlist.html` in source
2. rsync → clone → commit + push

### Editing the OpenClaw subdomain
1. Edit files in `Mirror/deploy-openclaw/` source
2. rsync source/ → `~/deploy-openclaw-repo/` (excluding .git and .DS_Store)
3. commit + push to `vautr1n/mirror-openclaw-landing`

## Known issues / open items

- **Zombie repo**: `vautr1n/mirror-context-resurrector-landing` is not connected to anything. Delete via https://github.com/vautr1n/mirror-context-resurrector-landing/settings → Danger Zone.
- **Dead HTML in `mirror-openclaw-landing/blog/*.html`**: same filenames exist in `mirror-seo-pages/pages/blog/*.md`. The live `bymirror.ai/blog/*` URLs are almost certainly served from the MD pipeline (to be confirmed by looking at which repo's Cloudflare Pages project is bound to the `bymirror.ai` zone's `/blog` route). If confirmed dead, those HTML files can be removed from `mirror-openclaw-landing`.
- **Broken form in `template.html`**: see Analytics section above — the MD-built pages have a form that points at `formspree.io/YOUR_FORM_ID`. Never wired up.
- **PAT scoping**: the GitHub PAT used for pushes is a **fine-grained token** scoped per-repo. When you create a new repo, you must add it to the PAT's Repository access list at https://github.com/settings/personal-access-tokens or pushes fail with 403. Creating repos via API also fails — the PAT lacks `Administration: write`, so new repos must be created through the GitHub UI.

## Glossary

- **Source dir**: `~/Documents/Projets/Mirror-Dopel/Mirror/<name>/` — where you edit. Not a git repo.
- **Local clone**: `~/<name>-repo/` — the actual git repo. Gets the rsynced content, then commit + push.
- **Remote**: `github.com/vautr1n/<repo>` — the GitHub repository.
- **Live**: served by Cloudflare Pages, auto-rebuilt on push to `main`.
