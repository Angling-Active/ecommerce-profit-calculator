/**
 * Display helpers — GBP and percentages. Never surfaces NaN / Infinity.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EopcFormat = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var gbpFormatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  var pctFormatter = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });

  function isPresentNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function money(value, emptyLabel) {
    if (!isPresentNumber(value)) return emptyLabel == null ? '—' : emptyLabel;
    return gbpFormatter.format(value);
  }

  function moneySigned(value, emptyLabel) {
    if (!isPresentNumber(value)) return emptyLabel == null ? '—' : emptyLabel;
    var formatted = gbpFormatter.format(Math.abs(value));
    if (value > 0) return '+' + formatted;
    if (value < 0) return '−' + formatted.replace(/^-/, '');
    return formatted;
  }

  function percent(value, emptyLabel) {
    if (!isPresentNumber(value)) return emptyLabel == null ? '—' : emptyLabel;
    return pctFormatter.format(value) + '%';
  }

  function roas(value, emptyLabel) {
    if (!isPresentNumber(value)) return emptyLabel == null ? '—' : emptyLabel;
    return pctFormatter.format(value) + '%';
  }

  function plClass(value) {
    if (!isPresentNumber(value) || value === 0) return 'eopc-pl-neutral';
    return value > 0 ? 'eopc-pl-positive' : 'eopc-pl-negative';
  }

  function parseInputNumber(raw) {
    if (raw === null || raw === undefined) return null;
    var s = String(raw).trim().replace(/£/g, '').replace(/,/g, '');
    if (s === '' || s === '-' || s === '.') return null;
    var n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }

  return {
    money: money,
    moneySigned: moneySigned,
    percent: percent,
    roas: roas,
    plClass: plClass,
    parseInputNumber: parseInputNumber,
    isPresentNumber: isPresentNumber,
  };
});
