# Ecommerce Order Profitability Calculator

Standalone static tool for modelling the economics of a **single ecommerce order** in GBP (UK English). All maths runs in the browser; inputs are never sent to a server.

This repository is self-contained at the root (`index.html`, `css/`, `js/`, `tests/`). It is not wired into Laravel or WordPress.

## Architecture

```
Presentation (index.html + css/)  →  View bindings (js/ui.js)
                                       ↕
                                 Calculation engine (js/calc.js)
                                       ↕
                                 Unit tests (tests/)
```

| File | Role |
|------|------|
| `js/calc.js` | Pure financial engine — no DOM |
| `js/format.js` | GBP / % formatting; never shows NaN or Infinity |
| `js/ui.js` | Form state, mutual exclusivity, live results |
| `css/calculator.css` | Styles scoped under `.eopc` |
| `FINANCIAL_LOGIC.md` | Formulas, defaults, hand-worked reference scenario |
| `tests/run-tests.html` | Browser unit-test runner (no build step) |

## Open / run locally

No Node install or bundler is required for the calculator itself.

1. Open `index.html` in a modern browser, **or**
2. Serve the folder over HTTP (recommended if the browser blocks local module quirks / fonts):

```bash
# From the repository root:
python3 -m http.server 8765
# → http://127.0.0.1:8765/
```

## Run tests

Open `tests/run-tests.html` in a browser (or via the same static server: `http://127.0.0.1:8765/tests/run-tests.html`).

The page loads `js/calc.js` and `tests/calc.test.js` and reports pass/fail in the document title (`PASS` / `FAIL`).

Coverage includes the hand-worked reference scenario from `FINANCIAL_LOGIC.md`, VAT / discount / ads / break-even edge cases, and a walk that asserts no raw NaN or Infinity in outputs.

From a terminal (optional; same assertions as the browser harness):

```bash
node tests/run-tests-node.cjs
```

## Defaults (approved)

- VAT-registered on; 20% product VAT; delivery VAT matches product  
- VAT-inclusive revenue inputs  
- Discount on product only; COGS-from-margin uses pre-discount ex-VAT product revenue  
- Shipping P/L = net postage revenue − courier cost only  
- Ad basis default: net product revenue after discount (ex-VAT)  
- ROAS entered as 400 = 400%  
- Illustrative basket: £49.99 sell, 10% discount, £3.95 postage, £12 COGS, fulfilment and fees as in `Calc.defaultInputs()`

## Deploy

Copy the repository root (or clone it) to any static host (S3, Netlify, nginx, Laravel `public/`, etc.). Keep relative paths intact (`css/`, `js/`, `tests/`).

Optional: mount under Laravel as a static asset path without Blade coupling, e.g. copy or symlink into `public/tools/order-profitability-calculator/`.

## WordPress (docs only for v1)

Recommended later approach — **not implemented in this MVP**:

1. Create a thin plugin that registers a shortcode, e.g. `[order_profitability_calculator]`.
2. On shortcode render, output a single wrapper: `<div class="eopc" id="eopc-root">…</div>` (same markup as `index.html` body content, or enqueue a template partial).
3. `wp_enqueue_style` / `wp_enqueue_script` the scoped CSS and JS (`calculator.css`, `calc.js`, `format.js`, `ui.js`) only when the shortcode is present.
4. Rely on the `.eopc` root and BEM-like class prefix to avoid theme clashes; do not depend on theme Bootstrap/jQuery.
5. Do not load analytics that transmit field values.

## Accessibility & locale

- Semantic HTML5 fieldsets/sections via `<details>`, labelled inputs, `aria-describedby` on help text, live results region.
- Responsive: two columns on desktop (sticky results), single column on small screens.
- Currency and copy: UK English, £, `en-GB` number formatting.

## Licence note

Treat calculator content as product documentation + tooling for merchants.
