/* Pure pricing math for the App Revenue Calculator. No DOM access.
 *
 * Model: customers arrive at a constant rate (newPerMonth). Each customer
 * generates revenue by "age" (months since purchase, 0 = purchase month).
 * Revenue in month m is the sum over all cohorts, so it is linear in
 * newPerMonth and goal-solving is exact division, not iteration.
 *
 * o = { model: 'once'|'monthly'|'annual', commission, taxIncluded, taxRate,
 *       retention }  retention = fraction kept per billing period
 *       (monthly plans: 1 - monthly churn; annual plans: renewal rate).
 */
(function (root) {
  'use strict';

  var DEV_FEE = 99;   // Apple Developer Program, USD / year
  var HORIZON = 24;   // months simulated

  // Strip tax when the entered price includes VAT / sales tax.
  function preTax(price, o) {
    return o.taxIncluded ? price / (1 + (o.taxRate || 0) / 100) : price;
  }

  function netPerSale(price, o) {
    var p = preTax(price, o), fee = p * o.commission;
    return { preTax: p, tax: price - p, fee: fee, net: p - fee };
  }

  // Standard 30% drops to 15% after a subscriber's first year of paid service.
  function subRates(commission) {
    return { year1: commission, year2: Math.min(commission, 0.15) };
  }

  function ceilDiv(target, per) {
    if (!(per > 0) || !(target > 0)) return 0;
    return Math.ceil(target / per - 1e-9);
  }

  // Expected net revenue from ONE customer `age` months after purchase.
  function perCustomer(price, o, age) {
    var p = preTax(price, o), r = subRates(o.commission);
    var ret = o.retention == null ? 1 : o.retention;
    if (o.model === 'once') return age === 0 ? p * (1 - o.commission) : 0;
    var rate = age < 12 ? r.year1 : r.year2;
    if (o.model === 'monthly') return Math.pow(ret, age) * p * (1 - rate);
    if (age % 12 !== 0) return 0;                       // annual: bills at 0, 12, 24...
    return Math.pow(ret, age / 12) * p * (1 - rate);
  }

  // Lifetime net value of ONE new customer over `months`.
  function valuePerCustomer(price, o, months) {
    var t = 0;
    for (var a = 0; a < months; a++) t += perCustomer(price, o, a);
    return t;
  }

  // Monthly net revenue, months 1..months, for `newPerMonth` arrivals each month.
  function simulate(price, o, newPerMonth, months) {
    months = months || HORIZON;
    var out = [], per = 0;
    for (var m = 0; m < months; m++) {
      per += perCustomer(price, o, m);                  // sum of ages 0..m
      out.push(per * newPerMonth);
    }
    return out;
  }

  // First month (1-based) where cumulative net reaches `target`; null if never.
  function paybackMonth(series, target) {
    var c = 0;
    for (var i = 0; i < series.length; i++) {
      c += series[i];
      if (c >= target) return i + 1;
    }
    return null;
  }

  // New customers per month needed for `monthly` net revenue in month `month` (1-based).
  // Revenue in month m per 1 arrival/month = sum of perCustomer over ages 0..m-1.
  function customersNeeded(price, o, monthly, month) {
    return ceilDiv(monthly, valuePerCustomer(price, o, month));
  }

  var api = {
    DEV_FEE: DEV_FEE, HORIZON: HORIZON, netPerSale: netPerSale, subRates: subRates,
    ceilDiv: ceilDiv, perCustomer: perCustomer, valuePerCustomer: valuePerCustomer,
    simulate: simulate, paybackMonth: paybackMonth, customersNeeded: customersNeeded
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RevCalc = api;
})(typeof self !== 'undefined' ? self : this);
