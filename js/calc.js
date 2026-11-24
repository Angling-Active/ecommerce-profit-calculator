/**
 * Ecommerce Order Profitability Calculator — pure calculation engine.
 * No DOM access. All money maths in GBP floating point.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EopcCalc = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ROAS_SCENARIO_VALUES = [300, 400, 500, 600, 700, 800, 900, 1000];

  function num(value) {
    if (value === null || value === undefined || value === '') return 0;
    var n = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  function finiteOrNull(value) {
    return Number.isFinite(value) ? value : null;
  }

  function clampNonNegative(value) {
    return value < 0 ? 0 : value;
  }

  /**
   * Split an amount into net + VAT.
   * When not VAT-registered, remitted VAT is zero and the full amount is net.
   */
  function splitVat(amount, ratePercent, inclusive, vatRegistered) {
    var a = num(amount);
    var rate = num(ratePercent);
    if (!vatRegistered || rate <= 0 || a === 0) {
      return { net: a, vat: 0, gross: a };
    }
    if (inclusive) {
      var vatInc = a * rate / (100 + rate);
      return { net: a - vatInc, vat: vatInc, gross: a };
    }
    var vatEx = a * rate / 100;
    return { net: a, vat: vatEx, gross: a + vatEx };
  }

  function discountedProduct(sellingPrice, discountMode, discountPercent, discountAmount) {
    var price = num(sellingPrice);
    var mode = discountMode || 'none';
    if (mode === 'percent') {
      return clampNonNegative(price * (1 - num(discountPercent) / 100));
    }
    if (mode === 'amount') {
      return clampNonNegative(price - num(discountAmount));
    }
    return clampNonNegative(price);
  }

  function preDiscountProductExVat(input) {
    var price = num(input.sellingPrice);
    var rate = num(input.productVatRate);
    var vatRegistered = !!input.vatRegistered;
    var inclusive = !!input.pricesIncludeVat;
    if (vatRegistered && inclusive && rate > 0) {
      return price * 100 / (100 + rate);
    }
    return price;
  }

  function resolveCogs(input, preDiscountExVat) {
    if ((input.cogsMode || 'actual') === 'margin') {
      return clampNonNegative(preDiscountExVat * (1 - num(input.grossMarginPercent) / 100));
    }
    return clampNonNegative(num(input.cogs));
  }

  function resolveAdBasis(basisKey, parts) {
    switch (basisKey) {
      case 'netOrder':
        return parts.netOrderRevenue;
      case 'grossProduct':
        return parts.productCustomer;
      case 'grossOrder':
        return parts.grossTransactionValue;
      case 'netProduct':
      default:
        return parts.productNet;
    }
  }

  function resolveAdsSpend(input, basis) {
    var mode = input.adsMode || 'cac';
    if (mode === 'percent') {
      return clampNonNegative(basis * num(input.adsPercent) / 100);
    }
    if (mode === 'roas') {
      var roas = num(input.roas);
      if (roas <= 0 || basis <= 0) return null;
      return clampNonNegative(basis / (roas / 100));
    }
    return clampNonNegative(num(input.cac));
  }

  function pctOf(numerator, denominator) {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return null;
    }
    return (numerator / denominator) * 100;
  }

  function buildScenarios(basis, preMarketing, overhead) {
    return ROAS_SCENARIO_VALUES.map(function (roas) {
      var spend = basis > 0 ? basis / (roas / 100) : null;
      var estimated =
        spend === null || !Number.isFinite(spend)
          ? null
          : preMarketing - spend - overhead;
      return {
        roas: roas,
        adsSpend: finiteOrNull(spend),
        estimatedProfit: finiteOrNull(estimated),
      };
    });
  }

  /**
   * @param {object} raw Input bag (see FINANCIAL_LOGIC.md)
   * @returns {object} Results
   */
  function calculate(raw) {
    var input = raw || {};
    var vatRegistered = input.vatRegistered !== false;
    var pricesIncludeVat = input.pricesIncludeVat !== false;
    var productVatRate = num(input.productVatRate);
    var deliveryVatRate =
      input.deliveryVatRate === null || input.deliveryVatRate === undefined || input.deliveryVatRate === ''
        ? productVatRate
        : num(input.deliveryVatRate);

    var productCustomer = discountedProduct(
      input.sellingPrice,
      input.discountMode,
      input.discountPercent,
      input.discountAmount
    );
    var postageCustomer = clampNonNegative(num(input.postageCharged));

    var productSplit = splitVat(productCustomer, productVatRate, pricesIncludeVat, vatRegistered);
    var postageSplit = splitVat(postageCustomer, deliveryVatRate, pricesIncludeVat, vatRegistered);

    // Customer-facing totals always reflect what was entered (inc or ex),
    // plus VAT only when prices were exclusive and VAT-registered.
    var productGrossCustomer = pricesIncludeVat || !vatRegistered
      ? productCustomer
      : productSplit.gross;
    var postageGrossCustomer = pricesIncludeVat || !vatRegistered
      ? postageCustomer
      : postageSplit.gross;

    var grossTransactionValue = productGrossCustomer + postageGrossCustomer;
    var productNet = productSplit.net;
    var productVat = productSplit.vat;
    var postageNet = postageSplit.net;
    var postageVat = postageSplit.vat;
    var vatLiability = productVat + postageVat;
    var netOrderRevenue = productNet + postageNet;

    var preDiscountExVat = preDiscountProductExVat({
      sellingPrice: input.sellingPrice,
      productVatRate: productVatRate,
      vatRegistered: vatRegistered,
      pricesIncludeVat: pricesIncludeVat,
    });
    var cogs = resolveCogs(input, preDiscountExVat);

    var courierCost = clampNonNegative(num(input.courierCost));
    var packagingCost = clampNonNegative(num(input.packagingCost));
    var pickPackCost = clampNonNegative(num(input.pickPackCost));
    var otherVariableCost = clampNonNegative(num(input.otherVariableCost));
    var fulfilment = courierCost + packagingCost + pickPackCost + otherVariableCost;

    var paymentFees =
      grossTransactionValue * num(input.paymentFeePercent) / 100 +
      clampNonNegative(num(input.paymentFeeFixed));

    var returnsCost = clampNonNegative(num(input.returnsCost));
    var overheadPerOrder = clampNonNegative(num(input.overheadPerOrder));

    var shippingPL = postageNet - courierCost;
    var productGrossProfit = productNet - cogs;

    var preMarketing =
      netOrderRevenue - cogs - fulfilment - paymentFees - returnsCost;

    var partsForBasis = {
      productNet: productNet,
      netOrderRevenue: netOrderRevenue,
      productCustomer: productGrossCustomer,
      grossTransactionValue: grossTransactionValue,
    };
    var adBasisValue = resolveAdBasis(input.adBasis || 'netProduct', partsForBasis);
    var adsSpend = resolveAdsSpend(input, adBasisValue);

    var contributionProfit =
      adsSpend === null ? null : preMarketing - adsSpend;
    var estimatedProfit =
      contributionProfit === null ? null : contributionProfit - overheadPerOrder;

    var breakEvenCac = preMarketing - overheadPerOrder;
    var targetMarginPercent = num(input.targetMarginPercent);
    if (input.targetMarginPercent === null || input.targetMarginPercent === undefined || input.targetMarginPercent === '') {
      targetMarginPercent = 10;
    }
    var targetProfit = netOrderRevenue * targetMarginPercent / 100;
    var targetCac = preMarketing - overheadPerOrder - targetProfit;

    var breakEvenRoas =
      breakEvenCac > 0 && adBasisValue > 0
        ? (adBasisValue / breakEvenCac) * 100
        : null;
    var targetRoas =
      targetCac > 0 && adBasisValue > 0
        ? (adBasisValue / targetCac) * 100
        : null;

    return {
      meta: {
        vatRegistered: vatRegistered,
        pricesIncludeVat: pricesIncludeVat,
        productVatRate: productVatRate,
        deliveryVatRate: deliveryVatRate,
        adsMode: input.adsMode || 'cac',
        adBasis: input.adBasis || 'netProduct',
        cogsMode: input.cogsMode || 'actual',
        discountMode: input.discountMode || 'none',
      },
      revenue: {
        productCustomer: productGrossCustomer,
        postageCustomer: postageGrossCustomer,
        productNet: productNet,
        productVat: productVat,
        postageNet: postageNet,
        postageVat: postageVat,
        grossTransactionValue: grossTransactionValue,
        vatLiability: vatLiability,
        netOrderRevenue: netOrderRevenue,
        preDiscountProductExVat: preDiscountExVat,
      },
      costs: {
        cogs: cogs,
        courierCost: courierCost,
        packagingCost: packagingCost,
        pickPackCost: pickPackCost,
        otherVariableCost: otherVariableCost,
        fulfilment: fulfilment,
        paymentFees: paymentFees,
        returnsCost: returnsCost,
        adsSpend: finiteOrNull(adsSpend),
        overheadPerOrder: overheadPerOrder,
        adBasisValue: adBasisValue,
      },
      profit: {
        productGrossProfit: productGrossProfit,
        shippingPL: shippingPL,
        preMarketing: preMarketing,
        contributionProfit: finiteOrNull(contributionProfit),
        estimatedProfit: finiteOrNull(estimatedProfit),
        productGrossMarginPct: pctOf(productGrossProfit, productNet),
        contributionMarginPct: pctOf(contributionProfit, netOrderRevenue),
        estimatedMarginPct: pctOf(estimatedProfit, netOrderRevenue),
        preMarketingMarginPct: pctOf(preMarketing, netOrderRevenue),
      },
      targets: {
        breakEvenCac: breakEvenCac,
        breakEvenRoas: finiteOrNull(breakEvenRoas),
        targetMarginPercent: targetMarginPercent,
        targetProfit: targetProfit,
        targetCac: targetCac,
        targetRoas: finiteOrNull(targetRoas),
        breakEvenImpossible: breakEvenCac <= 0,
        targetImpossible: targetCac <= 0,
      },
      scenarios: buildScenarios(adBasisValue, preMarketing, overheadPerOrder),
      flags: {
        zeroRevenue: netOrderRevenue === 0,
        adsUndefined: adsSpend === null,
        breakEvenRoasUndefined: breakEvenRoas === null,
        targetRoasUndefined: targetRoas === null,
      },
    };
  }

  function defaultInputs() {
    return {
      sellingPrice: 49.99,
      pricesIncludeVat: true,
      vatRegistered: true,
      productVatRate: 20,
      deliveryVatRate: 20,
      discountMode: 'percent',
      discountPercent: 10,
      discountAmount: 0,
      postageCharged: 3.95,
      cogsMode: 'actual',
      cogs: 12,
      grossMarginPercent: 70,
      courierCost: 2.8,
      packagingCost: 0.4,
      pickPackCost: 0.75,
      otherVariableCost: 0,
      paymentFeePercent: 1.5,
      paymentFeeFixed: 0.2,
      adsMode: 'cac',
      cac: 8,
      adsPercent: 20,
      roas: 400,
      adBasis: 'netProduct',
      overheadPerOrder: 0,
      returnsCost: 0,
      targetMarginPercent: 10,
    };
  }

  return {
    calculate: calculate,
    defaultInputs: defaultInputs,
    splitVat: splitVat,
    ROAS_SCENARIO_VALUES: ROAS_SCENARIO_VALUES,
  };
});
