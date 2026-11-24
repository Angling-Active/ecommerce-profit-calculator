#!/usr/bin/env node
/**
 * Headless runner for calc.test.js (same assertions as run-tests.html).
 * Usage: node tests/run-tests-node.js
 */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.join(__dirname, '..');
var passed = 0;
var failed = 0;
var currentSuite = '';

function loadScript(file, sandbox) {
  var code = fs.readFileSync(file, 'utf8');
  vm.runInNewContext(code, sandbox, { filename: file });
}

var sandbox = {
  console: console,
  module: { exports: {} },
  exports: {},
  self: {},
  window: {},
};
sandbox.root = sandbox.self;

loadScript(path.join(root, 'js/calc.js'), sandbox);
sandbox.window.EopcCalc = sandbox.module.exports;

sandbox.window.EopcAssert = {
  suite: function (name) {
    currentSuite = name;
    console.log('\n▸ ' + name);
  },
  ok: function (cond, msg) {
    if (cond) {
      passed++;
      console.log('  ✓ ' + msg);
    } else {
      failed++;
      console.log('  ✗ ' + msg + (currentSuite ? ' [' + currentSuite + ']' : ''));
    }
  },
  equal: function (actual, expected, msg) {
    var ok = Object.is(actual, expected) || actual === expected;
    this.ok(ok, (msg || 'equal') + ' (expected ' + expected + ', got ' + actual + ')');
  },
  done: function () {
    var total = passed + failed;
    console.log('\n' + (failed ? failed + ' failed / ' + total : 'All ' + total + ' assertions passed'));
    process.exit(failed ? 1 : 0);
  },
};

loadScript(path.join(__dirname, 'calc.test.js'), sandbox);
