/**
 * DOM bindings for the Ecommerce Order Profitability Calculator.
 */
(function () {
  'use strict';

  var Calc = window.EopcCalc;
  var Format = window.EopcFormat;
  if (!Calc || !Format) {
    console.error('EOPC: calc.js and format.js must load before ui.js');
    return;
  }

  var form = document.getElementById('eopc-form');
  var results = document.getElementById('eopc-results');
  var alertEl = document.getElementById('eopc-alert');
  var scenariosBody = document.querySelector('#eopc-scenarios tbody');
  var resetBtn = document.getElementById('eopc-reset');

  var NUMBER_FIELDS = [
    'sellingPrice',
    'discountPercent',
    'discountAmount',
    'postageCharged',
    'productVatRate',
    'deliveryVatRate',
    'cogs',
    'grossMarginPercent',
    'courierCost',
    'packagingCost',
    'pickPackCost',
    'otherVariableCost',
    'paymentFeePercent',
    'paymentFeeFixed',
    'cac',
    'adsPercent',
    'roas',
    'overheadPerOrder',
    'returnsCost',
    'targetMarginPercent',
  ];

  function radioValue(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }

  function setRadio(name, value) {
    var el = form.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (el) el.checked = true;
  }

  function readNumber(id) {
    var el = document.getElementById(id);
    if (!el) return 0;
    var parsed = Format.parseInputNumber(el.value);
    return parsed === null ? 0 : parsed;
  }

  function setNumber(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = value === null || value === undefined ? '' : String(value);
  }

  function validateField(el) {
    var errorEl = document.getElementById(el.id + '-error');
    var raw = el.value.trim();
    if (raw === '') {
      el.classList.remove('is-invalid');
      if (errorEl) errorEl.textContent = '';
      return true;
    }
    var parsed = Format.parseInputNumber(raw);
    var min = el.min !== '' ? parseFloat(el.min) : null;
    var max = el.max !== '' ? parseFloat(el.max) : null;
    var invalid =
      parsed === null ||
      (min !== null && Number.isFinite(min) && parsed < min) ||
      (max !== null && Number.isFinite(max) && parsed > max);
    el.classList.toggle('is-invalid', invalid);
    if (errorEl) {
      errorEl.textContent = invalid ? 'Enter a valid number' + (min !== null ? ' ≥ ' + min : '') : '';
    }
    return !invalid;
  }

  function syncModePanels() {
    form.querySelectorAll('.eopc-mode-panel').forEach(function (panel) {
      var rule = panel.getAttribute('data-show-when');
      if (!rule) return;
      var parts = rule.split(':');
      var name = parts[0];
      var want = parts[1];
      var current = radioValue(name);
      panel.hidden = current !== want;
    });
  }

  function collectInputs() {
    var pricesIncludeVat = radioValue('pricesIncludeVat') !== 'false';
    return {
      sellingPrice: readNumber('sellingPrice'),
      pricesIncludeVat: pricesIncludeVat,
      vatRegistered: document.getElementById('vatRegistered').checked,
      productVatRate: readNumber('productVatRate'),
      deliveryVatRate: readNumber('deliveryVatRate'),
      discountMode: radioValue('discountMode') || 'none',
      discountPercent: readNumber('discountPercent'),
      discountAmount: readNumber('discountAmount'),
      postageCharged: readNumber('postageCharged'),
      cogsMode: radioValue('cogsMode') || 'actual',
      cogs: readNumber('cogs'),
      grossMarginPercent: readNumber('grossMarginPercent'),
      courierCost: readNumber('courierCost'),
      packagingCost: readNumber('packagingCost'),
      pickPackCost: readNumber('pickPackCost'),
      otherVariableCost: readNumber('otherVariableCost'),
      paymentFeePercent: readNumber('paymentFeePercent'),
      paymentFeeFixed: readNumber('paymentFeeFixed'),
      adsMode: radioValue('adsMode') || 'cac',
      cac: readNumber('cac'),
      adsPercent: readNumber('adsPercent'),
      roas: readNumber('roas'),
      adBasis: document.getElementById('adBasis').value || 'netProduct',
      overheadPerOrder: readNumber('overheadPerOrder'),
      returnsCost: readNumber('returnsCost'),
      targetMarginPercent: readNumber('targetMarginPercent'),
    };
  }

  function applyDefaults() {
    var d = Calc.defaultInputs();
    setNumber('sellingPrice', d.sellingPrice);
    setRadio('pricesIncludeVat', String(d.pricesIncludeVat));
    document.getElementById('vatRegistered').checked = d.vatRegistered;
    setNumber('productVatRate', d.productVatRate);
    setNumber('deliveryVatRate', d.deliveryVatRate);
    setRadio('discountMode', d.discountMode);
    setNumber('discountPercent', d.discountPercent);
    setNumber('discountAmount', d.discountAmount);
    setNumber('postageCharged', d.postageCharged);
    setRadio('cogsMode', d.cogsMode);
    setNumber('cogs', d.cogs);
    setNumber('grossMarginPercent', d.grossMarginPercent);
    setNumber('courierCost', d.courierCost);
    setNumber('packagingCost', d.packagingCost);
    setNumber('pickPackCost', d.pickPackCost);
    setNumber('otherVariableCost', d.otherVariableCost);
    setNumber('paymentFeePercent', d.paymentFeePercent);
    setNumber('paymentFeeFixed', d.paymentFeeFixed);
    setRadio('adsMode', d.adsMode);
    setNumber('cac', d.cac);
    setNumber('adsPercent', d.adsPercent);
    setNumber('roas', d.roas);
    document.getElementById('adBasis').value = d.adBasis;
    setNumber('overheadPerOrder', d.overheadPerOrder);
    setNumber('returnsCost', d.returnsCost);
    setNumber('targetMarginPercent', d.targetMarginPercent);
    NUMBER_FIELDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.classList.remove('is-invalid');
        var err = document.getElementById(id + '-error');
        if (err) err.textContent = '';
      }
    });
    syncModePanels();
  }

  function setText(selector, text) {
    results.querySelectorAll(selector).forEach(function (el) {
      el.textContent = text;
    });
  }

  function setMetricTone(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('eopc-pl-positive', 'eopc-pl-negative', 'eopc-pl-neutral');
    el.classList.add(Format.plClass(value));
  }

  function marginSub(pct) {
    if (!Format.isPresentNumber(pct)) return '— of net order revenue';
    return Format.percent(pct) + ' of net order revenue';
  }

  function renderBar(r) {
    var product = Math.max(0, r.revenue.productNet);
    var postage = Math.max(0, r.revenue.postageNet);
    var vat = Math.max(0, r.revenue.vatLiability);
    var total = product + postage + vat;
    var pPct = total > 0 ? (product / total) * 100 : 0;
    var sPct = total > 0 ? (postage / total) * 100 : 0;
    var vPct = total > 0 ? (vat / total) * 100 : 0;
    document.getElementById('bar-product').style.width = pPct + '%';
    document.getElementById('bar-postage').style.width = sPct + '%';
    document.getElementById('bar-vat').style.width = vPct + '%';
  }

  function renderScenarios(scenarios, currentRoas, adsMode) {
    scenariosBody.innerHTML = '';
    scenarios.forEach(function (row) {
      var tr = document.createElement('tr');
      if (adsMode === 'roas' && Format.isPresentNumber(currentRoas) && row.roas === Math.round(currentRoas)) {
        tr.className = 'is-highlight';
      }
      var profitClass = Format.plClass(row.estimatedProfit);
      tr.innerHTML =
        '<td>' + Format.roas(row.roas) + '</td>' +
        '<td>' + Format.money(row.adsSpend) + '</td>' +
        '<td class="' + profitClass + '">' + Format.money(row.estimatedProfit) + '</td>';
      scenariosBody.appendChild(tr);
    });
  }

  function renderAlert(r) {
    var messages = [];
    if (r.flags.zeroRevenue) {
      messages.push('Net order revenue is zero — margin percentages are undefined.');
    }
    if (r.flags.adsUndefined) {
      messages.push('Advertising spend cannot be calculated from the current ROAS / revenue basis.');
    }
    if (r.flags.breakEvenRoasUndefined) {
      if (r.targets.breakEvenImpossible) {
        messages.push('Break-even is impossible even at zero ad spend — variable costs and overheads exceed net revenue.');
      } else {
        messages.push('Break-even ROAS is undefined (check ad revenue basis).');
      }
    }
    if (r.flags.targetRoasUndefined && r.targets.targetImpossible) {
      messages.push('Target margin is not reachable at any non-negative CAC with the current cost structure.');
    }
    if (messages.length) {
      alertEl.hidden = false;
      alertEl.textContent = messages.join(' ');
    } else {
      alertEl.hidden = true;
      alertEl.textContent = '';
    }
  }

  function render() {
    var valid = true;
    NUMBER_FIELDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !validateField(el)) valid = false;
    });
    if (!valid) return;

    var input = collectInputs();
    var r = Calc.calculate(input);

    setText('[data-out="estimatedProfit"]', Format.money(r.profit.estimatedProfit));
    setText('[data-out="estimatedMarginPct"]', marginSub(r.profit.estimatedMarginPct));
    setText('[data-out="contributionProfit"]', Format.money(r.profit.contributionProfit));
    setText('[data-out="contributionMarginPct"]', marginSub(r.profit.contributionMarginPct));
    setText('[data-out="preMarketing"]', Format.money(r.profit.preMarketing));
    setText('[data-out="preMarketingMarginPct"]', marginSub(r.profit.preMarketingMarginPct));

    setMetricTone('metric-estimated', r.profit.estimatedProfit);
    setMetricTone('metric-contribution', r.profit.contributionProfit);
    setMetricTone('metric-premkt', r.profit.preMarketing);

    setText('[data-out="productNet"]', Format.money(r.revenue.productNet));
    setText('[data-out="postageNet"]', Format.money(r.revenue.postageNet));
    setText('[data-out="vatLiability"]', Format.money(r.revenue.vatLiability));
    setText('[data-out="grossTransactionValue"]', Format.money(r.revenue.grossTransactionValue));
    setText('[data-out="netOrderRevenue"]', Format.money(r.revenue.netOrderRevenue));
    setText('[data-out="productGrossProfit"]', Format.money(r.profit.productGrossProfit));
    setText('[data-out="shippingPL"]', Format.moneySigned(r.profit.shippingPL));
    setText('[data-out="cogs"]', Format.money(r.costs.cogs));
    setText('[data-out="fulfilment"]', Format.money(r.costs.fulfilment));
    setText('[data-out="paymentFees"]', Format.money(r.costs.paymentFees));
    setText('[data-out="adsSpend"]', Format.money(r.costs.adsSpend));
    setText('[data-out="overheadPerOrder"]', Format.money(r.costs.overheadPerOrder));

    setText('[data-out="breakEvenCac"]', Format.money(r.targets.breakEvenCac));
    setText('[data-out="breakEvenRoas"]', Format.roas(r.targets.breakEvenRoas));
    setText('[data-out="targetCac"]', Format.money(r.targets.targetCac));
    setText('[data-out="targetRoas"]', Format.roas(r.targets.targetRoas));
    setText('[data-out="adBasisValue"]', Format.money(r.costs.adBasisValue));

    renderBar(r);
    renderScenarios(r.scenarios, input.roas, input.adsMode);
    renderAlert(r);
  }

  function onFormChange() {
    syncModePanels();
    render();
  }

  form.addEventListener('input', onFormChange);
  form.addEventListener('change', onFormChange);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    render();
  });

  resetBtn.addEventListener('click', function () {
    applyDefaults();
    render();
  });

  applyDefaults();
  render();
})();
