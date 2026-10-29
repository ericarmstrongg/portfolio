/* DOM layer for the App Revenue Calculator. All math lives in calc.js (RevCalc). */
(function () {
  'use strict';
  var C = window.RevCalc;
  var $ = function (id) { return document.getElementById(id); };
  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  var usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  var int = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  function money(n) { return Math.abs(n) >= 1000 ? usd0.format(n) : usd.format(n); }

  // Defaults applied on model switch, but only to fields the person hasn't edited.
  var DEFAULTS = {
    once:    { price: '4.99' },
    monthly: { price: '2.99', retention: '8' },
    annual:  { price: '19.99', retention: '60' }
  };
  var LADDERS = {
    once:    [0.99, 1.99, 2.99, 3.99, 4.99, 6.99, 9.99, 14.99, 19.99, 29.99, 49.99],
    monthly: [0.99, 1.99, 2.99, 4.99, 6.99, 9.99, 14.99],
    annual:  [4.99, 9.99, 19.99, 29.99, 49.99, 79.99, 99.99]
  };
  var touched = {};

  function radio(name) { return document.querySelector('input[name="' + name + '"]:checked').value; }
  function val(id, min, max) {
    var n = parseFloat($(id).value);
    if (!isFinite(n)) n = 0;
    if (n < min) n = min;
    if (max != null && n > max) n = max;
    return n;
  }
  function set(id, text) { $(id).textContent = text; }

  function applyDefaults(model) {
    var d = DEFAULTS[model];
    if (!touched.price) $('price').value = d.price;
    if (d.retention && !touched.retention) $('retention').value = d.retention;
  }

  function render() {
    var model = radio('model'), isSub = model !== 'once';
    var commission = parseFloat(radio('program'));
    var price = val('price', 0), n = val('newPerMonth', 0);
    var costs = val('costs', 0), goal = val('goal', 0);
    var raw = val('retention', 0, 100) / 100;
    var o = {
      model: model, commission: commission,
      taxIncluded: $('taxIncl').checked, taxRate: val('taxRate', 0, 50),
      retention: model === 'monthly' ? 1 - raw : raw
    };
    var noun = function (k) { return model === 'once' ? (k === 1 ? 'sale' : 'sales') : (k === 1 ? 'new subscriber' : 'new subscribers'); };

    // Input visibility + labels
    $('taxField').hidden = !o.taxIncluded;
    $('churnField').hidden = !isSub;
    set('retentionLabel', model === 'annual' ? 'Annual renewal rate (%)' : 'Monthly churn (%)');
    set('priceLabel', model === 'once' ? 'Price (USD)' : model === 'monthly' ? 'Price per month (USD)' : 'Price per year (USD)');
    set('newLabel', model === 'once' ? 'New sales per month' : 'New subscribers per month');
    set('rateHint', commission === 0.15
      ? 'For developers under $1M in proceeds per year; you need to enroll.'
      : (isSub ? 'Standard rate for developers over $1M or not enrolled. Subscriptions drop to 15% after a subscriber’s first year.'
               : 'Standard rate for developers over $1M or not enrolled.'));

    // Headline numbers
    var sale = C.netPerSale(price, o), rates = C.subRates(commission);
    var rev = C.simulate(price, o, n);
    var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
    var y1 = sum(rev.slice(0, 12)), y2 = sum(rev);

    set('sNet', usd.format(sale.net));
    var netSub = 'Apple keeps ' + usd.format(sale.fee) + ' (' + Math.round(commission * 100) + '%)';
    if (o.taxIncluded) netSub += ' · tax ' + usd.format(sale.tax);
    if (isSub && rates.year2 !== rates.year1) netSub += ' · year 2+: ' + usd.format(sale.preTax * (1 - rates.year2));
    set('sNetSub', netSub);

    var dev = C.paybackMonth(rev, C.DEV_FEE);
    set('sDev', n > 0 && sale.net > 0 ? (dev ? 'Month ' + dev : 'After month 24') : '–');
    set('sDevSub', model === 'once' && sale.net > 0
      ? 'About ' + int.format(C.ceilDiv(C.DEV_FEE, sale.net)) + ' sales covers the $' + C.DEV_FEE + ' fee'
      : 'Cumulative net reaches $' + C.DEV_FEE);

    set('sM12', money(rev[11]));
    set('sM12Sub', money(rev[11] - costs) + '/mo after costs');
    set('sY1', money(y1));
    set('sY1Sub', money(y1 - costs * 12) + ' after costs');
    set('sY2', money(y2));
    set('sY2Sub', money(y2 - costs * 24) + ' after costs');
    set('sLtv', usd.format(C.valuePerCustomer(price, o, 36)));
    set('sLtvSub', model === 'once' ? 'One-time purchase'
      : '12 months: ' + usd.format(C.valuePerCustomer(price, o, 12)) + ' · includes churn and the year-2 rate');

    // Chart
    var max = Math.max.apply(null, rev.concat([1])), html = '';
    for (var i = 0; i < rev.length; i++) {
      var h = Math.max(0.5, rev[i] / max * 100);
      html += '<div class="bar' + (rev[i] < costs ? ' neg' : '') + '" tabindex="0" style="height:' + h.toFixed(1) +
        '%" data-tip="Month ' + (i + 1) + ': ' + money(rev[i]) + '"></div>';
    }
    $('chart').innerHTML = html;

    // Goal solving (goal is profit, so revenue must cover goal + costs)
    var target = goal + costs;
    var need12 = C.customersNeeded(price, o, target, 12);
    if (!(sale.net > 0)) {
      set('goalText', 'Enter a price above $0 to see what it takes.');
      set('beText', '');
    } else {
      $('goalText').innerHTML = 'To net <strong>' + money(goal) + '/mo</strong> after Apple’s cut and costs by month 12, you need about <strong>' +
        int.format(need12) + ' ' + noun(need12) + ' per month</strong>' + (n > 0 ? ' (vs. ' + int.format(n) + ' now).' : '.');
      var parts = [];
      if (costs > 0) {
        var be = C.customersNeeded(price, o, costs, 12);
        parts.push('Break-even on ' + money(costs) + '/mo of fixed costs: about ' + int.format(be) + ' ' + noun(be) + ' per month.');
      }
      if (isSub) parts.push('Subscribers compound: by month 24 the same goal needs only about ' +
        int.format(C.customersNeeded(price, o, target, 24)) + ' per month.');
      set('beText', parts.join(' '));
    }

    // Price ladder
    var rows = '', pts = LADDERS[model].slice();
    set('ladderTitle', 'Price ladder' + (model === 'monthly' ? ' (per month)' : model === 'annual' ? ' (per year)' : ''));
    var head = '<tr><th scope="col">Price</th><th scope="col">' + (isSub ? 'You keep, yr 1' : 'You keep') + '</th>' +
      (isSub ? '<th scope="col">You keep, yr 2+</th>' : '') +
      '<th scope="col">Apple takes</th><th scope="col">' + (isSub ? 'Subs' : 'Sales') + '/mo for goal</th></tr>';
    pts.forEach(function (p) {
      var s = C.netPerSale(p, o);
      rows += '<tr' + (Math.abs(p - price) < 0.005 ? ' class="cur"' : '') + '><th scope="row">' + usd.format(p) + '</th><td>' +
        usd.format(s.net) + '</td>' + (isSub ? '<td>' + usd.format(s.preTax * (1 - rates.year2)) + '</td>' : '') +
        '<td>' + usd.format(s.fee) + '</td><td>' + int.format(C.customersNeeded(p, o, target, 12)) + '</td></tr>';
    });
    $('ladder').innerHTML = '<caption class="sr">Net proceeds and customers needed at common price points</caption><thead>' + head + '</thead><tbody>' + rows + '</tbody>';
  }

  $('form').addEventListener('input', function (e) {
    if (e.target.id === 'price') touched.price = true;
    if (e.target.id === 'retention') touched.retention = true;
    render();
  });
  $('form').addEventListener('change', function (e) {
    if (e.target.name === 'model') applyDefaults(e.target.value);
    render();
  });
  render();
})();
