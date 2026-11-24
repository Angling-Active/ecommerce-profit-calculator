# Financial logic — Ecommerce Order Profitability Calculator

All amounts are in GBP. Internal maths use full floating-point precision; display layers round for presentation only.

## Inputs (normalised)

| Field | Notes |
|--------|--------|
| `sellingPrice` | Product list price (before discount) |
| `pricesIncludeVat` | If true, selling price and postage charged are VAT-inclusive |
| `vatRegistered` | If false, no VAT is remitted; gross customer payment = net revenue |
| `productVatRate` | Product VAT % (default 20) |
| `deliveryVatRate` | Delivery VAT % (default = product rate) |
| `discountMode` | `'percent'` \| `'amount'` \| `'none'` |
| `discountPercent` / `discountAmount` | Applied to **product only**, not postage |
| `postageCharged` | Amount charged to the customer for delivery |
| `cogsMode` | `'actual'` \| `'margin'` |
| `cogs` | Actual cost of goods (ex-VAT when VAT-registered) |
| `grossMarginPercent` | List margin % → COGS from **pre-discount** ex-VAT product revenue |
| `courierCost`, `packagingCost`, `pickPackCost`, `otherVariableCost` | Fulfilment |
| `paymentFeePercent`, `paymentFeeFixed` | % of **total customer payment** + fixed fee |
| `adsMode` | `'cac'` \| `'percent'` \| `'roas'` |
| `cac`, `adsPercent`, `roas` | Mutually exclusive ad inputs; ROAS as 400 = 400% |
| `adBasis` | See ad revenue basis below |
| `overheadPerOrder` | Allocated fixed overheads per order |
| `returnsCost` | Expected returns cost £ per order (advanced) |
| `targetMarginPercent` | Target estimated profit as % of net order revenue (default 10) |

## Revenue and VAT

### Discounted product (gross of VAT treatment)

- Percent: `productAfterDiscount = sellingPrice × (1 − discountPercent / 100)`
- Amount: `productAfterDiscount = max(0, sellingPrice − discountAmount)`
- None: `productAfterDiscount = sellingPrice`

### Split into net + VAT

Helper `splitVat(amount, rate%, inclusive)`:

- Inclusive: `vat = amount × rate / (100 + rate)`, `net = amount − vat`
- Exclusive: `vat = amount × rate / 100`, `net = amount`, gross = net + vat
- Rate 0 or not VAT-registered: `vat = 0`, `net = amount` (customer payment unchanged)

When **not** VAT-registered, treat all revenue as net (no remitted VAT). Customer still pays the same gross figures entered.

- `productNet`, `productVat` from discounted product at `productVatRate`
- `postageNet`, `postageVat` from postage charged at `deliveryVatRate`
- **Gross transaction value** = discounted product (customer-facing) + postage charged (customer-facing)
- **VAT liability** = productVat + postageVat
- **Net order revenue** = productNet + postageNet

### Pre-discount product (ex-VAT)

Used only for margin → COGS:

- Inclusive + VAT-registered: `sellingPrice × 100 / (100 + productVatRate)`
- Otherwise: `sellingPrice` (already ex-VAT or no VAT)

## Costs

### COGS

- Actual: `cogs`
- Margin: `cogs = preDiscountProductExVat × (1 − grossMarginPercent / 100)`

### Fulfilment

`fulfilment = courier + packaging + pick/pack + other variable`

### Payment fees

`paymentFees = grossTransactionValue × paymentFeePercent / 100 + paymentFeeFixed`

### Shipping P/L

`shippingPL = postageNet − courierCost`  
(Packaging and labour stay in fulfilment, not in shipping P/L.)

### Advertising spend

Ad revenue **basis** options:

| `adBasis` | Value |
|-----------|--------|
| `netProduct` (default) | Net product revenue after discount (ex-VAT) |
| `netOrder` | Net order revenue (product + postage, ex-VAT) |
| `grossProduct` | Discounted product as paid by customer |
| `grossOrder` | Gross transaction value |

Spend:

- CAC: `adsSpend = cac`
- % of revenue: `adsSpend = basis × adsPercent / 100`
- ROAS: `adsSpend = basis ÷ (roas / 100)` when `roas > 0`

## Profit stack

1. **Product gross profit** = productNet − COGS  
2. **Pre-marketing contribution** = netOrderRevenue − COGS − fulfilment − paymentFees − returnsCost  
3. **Contribution profit** = preMarketing − adsSpend  
4. **Estimated profit after allocated overheads** = contribution − overheadPerOrder  

Margin percentages use **net order revenue** as denominator when it is &gt; 0; otherwise undefined.

## Break-even and targets

- **Max break-even CAC** = preMarketing − overheadPerOrder  
  (Ads spend that drives estimated profit to zero.)
- **Break-even ROAS** = `basis / breakEvenCac × 100` when break-even CAC &gt; 0 and basis &gt; 0  
- **Target profit £** = netOrderRevenue × targetMarginPercent / 100  
- **Target CAC** = preMarketing − overheadPerOrder − targetProfit  
- **Target ROAS** = `basis / targetCac × 100` when target CAC &gt; 0 and basis &gt; 0  

If break-even or target CAC ≤ 0, the corresponding ROAS is undefined (order cannot fund ads at that profit level).

## Scenario table

For ROAS values 300, 400, 500, 600, 700, 800, 900, 1000 (%):

`adsSpend = basis / (roas / 100)`  
`estimatedProfit = preMarketing − adsSpend − overhead`

## Edge cases

| Case | Behaviour |
|------|-----------|
| Zero / blank numeric inputs | Treated as 0 |
| Zero selling price | Revenue zero; margins undefined; break-even ROAS undefined if CAC ≤ 0 |
| Division by zero (ROAS, margins) | Result flagged `null` / undefined — UI shows “—” with explanation |
| Negative discount beyond price | Product after discount clamped to 0 |
| Impossible break-even | `breakEvenCac ≤ 0` → no finite break-even ROAS |
| NaN / Infinity | Engine never returns raw NaN/Infinity; uses `null` for undefined metrics |

## Hand-worked reference scenario

**Inputs (defaults):**

- Sell £49.99 VAT-inclusive, 10% discount, postage charged £3.95  
- Product & delivery VAT 20%, VAT-registered  
- COGS £12; courier £2.80; packaging £0.40; pick/pack £0.75  
- Payment 1.5% + £0.20; ads CAC £8; overheads £0; returns £0  
- Ad basis: net product after discount; target margin 10%

**Steps:**

| Step | Value |
|------|-------|
| Product after discount (inc VAT) | 49.99 × 0.9 = **44.991** |
| Product VAT | 44.991 × 20/120 = **7.4985** |
| Product net | **37.4925** |
| Postage VAT | 3.95 × 20/120 = **0.658333…** |
| Postage net | **3.291667…** |
| Gross transaction | **48.941** |
| Net order revenue | **40.784167…** |
| Fulfilment | 2.80 + 0.40 + 0.75 = **3.95** |
| Payment fees | 48.941 × 0.015 + 0.20 = **0.934115** |
| Product gross profit | 37.4925 − 12 = **25.4925** |
| Shipping P/L | 3.291667… − 2.80 = **0.491667…** |
| Pre-marketing contribution | 40.784167… − 12 − 3.95 − 0.934115 = **23.900052…** |
| Contribution profit | 23.900052… − 8 = **15.900052…** |
| Estimated profit | **15.900052…** (no overhead) |
| Break-even CAC | **23.900052…** |
| Ad basis | **37.4925** |
| Break-even ROAS | 37.4925 / 23.900052… × 100 ≈ **156.87%** |
| Target profit (10%) | 40.784167… × 0.10 ≈ **4.078417** |
| Target CAC | 23.900052… − 4.078417 ≈ **19.821635** |
| Target ROAS | 37.4925 / 19.821635 × 100 ≈ **189.15%** |

Tests assert these values within a small absolute tolerance (1e-6 for money; 0.01 for ROAS %).
