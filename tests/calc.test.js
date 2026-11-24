/**
 * Unit tests for EopcCalc — loaded by run-tests.html
 */
(function () {
  'use strict';

  var Calc = window.EopcCalc;
  var assert = window.EopcAssert;

  function approx(actual, expected, tol, msg) {
    tol = tol == null ? 1e-6 : tol;
    assert.ok(
      Math.abs(actual - expected) <= tol,
      (msg || 'approx') + ': expected ' + expected + ', got ' + actual
    );
  }

  function base(overrides) {
    var d = Calc.defaultInputs();
    if (!overrides) return d;
    Object.keys(overrides).forEach(function (k) {
      d[k] = overrides[k];
    });
    return d;
  }

  // --- Hand-worked reference scenario ---
  assert.suite('Reference scenario (FINANCIAL_LOGIC.md)');
  (function () {
    var r = Calc.calculate(base());
    approx(r.revenue.productCustomer, 44.991, 1e-6, 'product after discount');
    approx(r.revenue.productVat, 7.4985, 1e-6, 'product VAT');
    approx(r.revenue.productNet, 37.4925, 1e-6, 'product net');
    approx(r.revenue.postageVat, 3.95 * 20 / 120, 1e-6, 'postage VAT');
    approx(r.revenue.postageNet, 3.95 - 3.95 * 20 / 120, 1e-6, 'postage net');
    approx(r.revenue.grossTransactionValue, 48.941, 1e-6, 'gross TX');
    approx(r.revenue.netOrderRevenue, 40.78416666666667, 1e-6, 'net order');
    approx(r.costs.fulfilment, 3.95, 1e-6, 'fulfilment');
    approx(r.costs.paymentFees, 0.934115, 1e-6, 'payment fees');
    approx(r.profit.productGrossProfit, 25.4925, 1e-6, 'product GP');
    approx(r.profit.shippingPL, 3.95 - 3.95 * 20 / 120 - 2.8, 1e-6, 'shipping P/L');
    approx(r.profit.preMarketing, 23.90005166666667, 1e-5, 'pre-marketing');
    approx(r.profit.contributionProfit, 15.90005166666667, 1e-5, 'contribution');
    approx(r.profit.estimatedProfit, 15.90005166666667, 1e-5, 'estimated');
    approx(r.targets.breakEvenCac, 23.90005166666667, 1e-5, 'BE CAC');
    approx(r.targets.breakEvenRoas, 156.87, 0.02, 'BE ROAS');
    approx(r.targets.targetProfit, 4.078416666666667, 1e-5, 'target £');
    approx(r.targets.targetCac, 19.821635, 1e-4, 'target CAC');
    approx(r.targets.targetRoas, 189.15, 0.02, 'target ROAS');
  })();

  // --- Profitable vs loss-making ---
  assert.suite('Profitable and loss-making');
  (function () {
    var win = Calc.calculate(base({ cac: 5 }));
    assert.ok(win.profit.estimatedProfit > 0, 'profitable with low CAC');
    var lose = Calc.calculate(base({ cac: 50 }));
    assert.ok(lose.profit.estimatedProfit < 0, 'loss-making with high CAC');
  })();

  // --- Postage ---
  assert.suite('Postage P/L');
  (function () {
    var free = Calc.calculate(base({ postageCharged: 0, courierCost: 2.8 }));
    approx(free.profit.shippingPL, -2.8, 1e-6, 'free postage loss');
    var profitShip = Calc.calculate(base({ postageCharged: 5.95, courierCost: 2.8 }));
    assert.ok(profitShip.profit.shippingPL > 0, 'postage can be profitable');
  })();

  // --- VAT registration ---
  assert.suite('VAT registered vs not');
  (function () {
    var reg = Calc.calculate(base({ vatRegistered: true }));
    var unreg = Calc.calculate(base({ vatRegistered: false }));
    assert.ok(reg.revenue.vatLiability > 0, 'registered has VAT liability');
    approx(unreg.revenue.vatLiability, 0, 1e-9, 'unregistered no VAT');
    approx(unreg.revenue.netOrderRevenue, unreg.revenue.grossTransactionValue, 1e-9, 'unreg net=gross');
    assert.ok(unreg.revenue.netOrderRevenue > reg.revenue.netOrderRevenue, 'unreg keeps VAT in revenue');
  })();

  // --- Zero-rated ---
  assert.suite('Zero-rated VAT');
  (function () {
    var z = Calc.calculate(base({ productVatRate: 0, deliveryVatRate: 0 }));
    approx(z.revenue.vatLiability, 0, 1e-9, 'zero-rated VAT');
    approx(z.revenue.productNet, 44.991, 1e-6, 'product all net');
  })();

  // --- Discounts ---
  assert.suite('Discounts');
  (function () {
    var pct = Calc.calculate(base({ discountMode: 'percent', discountPercent: 10 }));
    var amt = Calc.calculate(base({ discountMode: 'amount', discountAmount: 4.999 }));
    approx(pct.revenue.productCustomer, amt.revenue.productCustomer, 1e-6, '% vs £ equivalent');
    var none = Calc.calculate(base({ discountMode: 'none' }));
    approx(none.revenue.productCustomer, 49.99, 1e-6, 'no discount');
  })();

  // --- Zero ads ---
  assert.suite('Zero ads');
  (function () {
    var z = Calc.calculate(base({ adsMode: 'cac', cac: 0 }));
    approx(z.costs.adsSpend, 0, 1e-9, 'zero CAC');
    approx(z.profit.contributionProfit, z.profit.preMarketing, 1e-6, 'contrib = pre-mkt');
  })();

  // --- ROAS modes ---
  assert.suite('ROAS and % ads');
  (function () {
    var high = Calc.calculate(base({ adsMode: 'roas', roas: 1000 }));
    var low = Calc.calculate(base({ adsMode: 'roas', roas: 200 }));
    assert.ok(high.costs.adsSpend < low.costs.adsSpend, 'higher ROAS = lower spend');
    var pct = Calc.calculate(base({ adsMode: 'percent', adsPercent: 20 }));
    approx(pct.costs.adsSpend, pct.costs.adBasisValue * 0.2, 1e-6, '20% of basis');
  })();

  // --- Zero selling price ---
  assert.suite('Zero selling price');
  (function () {
    var z = Calc.calculate(base({ sellingPrice: 0, discountMode: 'none', postageCharged: 0 }));
    approx(z.revenue.netOrderRevenue, 0, 1e-9, 'zero net revenue');
    assert.equal(z.profit.estimatedMarginPct, null, 'margin undefined');
    assert.ok(z.flags.zeroRevenue, 'zero revenue flag');
  })();

  // --- Impossible break-even ---
  assert.suite('Impossible break-even');
  (function () {
    var bad = Calc.calculate(
      base({
        sellingPrice: 10,
        discountMode: 'none',
        cogs: 9,
        courierCost: 5,
        packagingCost: 2,
        pickPackCost: 2,
        paymentFeePercent: 0,
        paymentFeeFixed: 0,
        overheadPerOrder: 5,
        postageCharged: 0,
      })
    );
    assert.ok(bad.targets.breakEvenCac <= 0, 'BE CAC <= 0');
    assert.equal(bad.targets.breakEvenRoas, null, 'BE ROAS undefined');
    assert.ok(bad.flags.breakEvenRoasUndefined, 'flag set');
  })();

  // --- Payment fee shapes ---
  assert.suite('Payment fees');
  (function () {
    var onlyPct = Calc.calculate(base({ paymentFeePercent: 2, paymentFeeFixed: 0 }));
    var onlyFix = Calc.calculate(base({ paymentFeePercent: 0, paymentFeeFixed: 0.3 }));
    approx(onlyPct.costs.paymentFees, onlyPct.revenue.grossTransactionValue * 0.02, 1e-6, '% only');
    approx(onlyFix.costs.paymentFees, 0.3, 1e-6, 'fixed only');
  })();

  // --- COGS vs margin equivalence ---
  assert.suite('COGS vs margin equivalence');
  (function () {
    var actual = Calc.calculate(base({ cogsMode: 'actual', cogs: 12 }));
    var preEx = actual.revenue.preDiscountProductExVat;
    var marginPct = (1 - 12 / preEx) * 100;
    var fromMargin = Calc.calculate(
      base({ cogsMode: 'margin', grossMarginPercent: marginPct })
    );
    approx(fromMargin.costs.cogs, 12, 1e-6, 'margin-derived COGS');
    approx(fromMargin.profit.estimatedProfit, actual.profit.estimatedProfit, 1e-5, 'same profit');
  })();

  // --- VAT exclusive prices ---
  assert.suite('VAT-exclusive selling price');
  (function () {
    var r = Calc.calculate(
      base({
        pricesIncludeVat: false,
        sellingPrice: 41.65833333333333,
        discountMode: 'none',
        postageCharged: 3.291666666666667,
      })
    );
    approx(r.revenue.productNet, 41.65833333333333, 1e-5, 'ex-VAT product net');
    approx(r.revenue.productVat, 41.65833333333333 * 0.2, 1e-5, 'ex-VAT product VAT');
    assert.ok(r.revenue.grossTransactionValue > r.revenue.netOrderRevenue, 'gross > net');
  })();

  // --- Scenarios ---
  assert.suite('ROAS scenario table');
  (function () {
    var r = Calc.calculate(base());
    assert.equal(r.scenarios.length, 8, '8 scenario rows');
    assert.equal(r.scenarios[0].roas, 300, 'starts at 300');
    assert.equal(r.scenarios[7].roas, 1000, 'ends at 1000');
    assert.ok(r.scenarios[0].adsSpend > r.scenarios[7].adsSpend, 'spend falls as ROAS rises');
  })();

  // --- Ad basis ---
  assert.suite('Ad revenue basis');
  (function () {
    var netP = Calc.calculate(base({ adsMode: 'percent', adsPercent: 10, adBasis: 'netProduct' }));
    var grossO = Calc.calculate(base({ adsMode: 'percent', adsPercent: 10, adBasis: 'grossOrder' }));
    approx(netP.costs.adBasisValue, netP.revenue.productNet, 1e-6, 'net product basis');
    approx(grossO.costs.adBasisValue, grossO.revenue.grossTransactionValue, 1e-6, 'gross order basis');
    assert.ok(grossO.costs.adsSpend > netP.costs.adsSpend, 'gross basis costs more ads');
  })();

  // --- Overheads ---
  assert.suite('Overheads');
  (function () {
    var r = Calc.calculate(base({ overheadPerOrder: 3 }));
    approx(
      r.profit.estimatedProfit,
      r.profit.contributionProfit - 3,
      1e-6,
      'estimated = contrib − OH'
    );
  })();

  // --- Returns ---
  assert.suite('Returns cost');
  (function () {
    var r = Calc.calculate(base({ returnsCost: 2 }));
    var plain = Calc.calculate(base({ returnsCost: 0 }));
    approx(r.profit.preMarketing, plain.profit.preMarketing - 2, 1e-6, 'returns reduce pre-mkt');
  })();

  // --- No NaN/Infinity ---
  assert.suite('No NaN or Infinity in outputs');
  (function () {
    var cases = [
      base({ sellingPrice: 0, postageCharged: 0, cac: 0 }),
      base({ adsMode: 'roas', roas: 0 }),
      base({ cogsMode: 'margin', grossMarginPercent: 100, sellingPrice: 0 }),
    ];
    cases.forEach(function (inp, i) {
      var r = Calc.calculate(inp);
      function walk(obj, path) {
        Object.keys(obj).forEach(function (k) {
          var v = obj[k];
          var p = path + '.' + k;
          if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            walk(v, p);
          } else if (Array.isArray(v)) {
            v.forEach(function (item, idx) {
              if (item && typeof item === 'object') walk(item, p + '[' + idx + ']');
            });
          } else if (typeof v === 'number') {
            assert.ok(Number.isFinite(v), 'finite at ' + p + ' case ' + i);
          }
        });
      }
      walk(r, 'r' + i);
    });
  })();

  assert.done();
})();
