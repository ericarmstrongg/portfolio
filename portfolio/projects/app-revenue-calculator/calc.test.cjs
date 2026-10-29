// Run: node portfolio/projects/app-revenue-calculator/calc.test.cjs
const assert = require('assert');
const vm = require('vm'), fs = require('fs');
const ctx = { self: {} };
vm.runInNewContext(fs.readFileSync(__dirname + '/calc.js', 'utf8'), ctx);
const c = ctx.self.RevCalc;
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + ' != ' + b);

// netPerSale (incl. VAT-inclusive prices)
near(c.netPerSale(4.99, { commission: 0.15 }).net, 4.99 * 0.85);
near(c.netPerSale(4.99, { commission: 0.30 }).net, 4.99 * 0.70);
near(c.netPerSale(11, { commission: 0.15, taxIncluded: true, taxRate: 10 }).net, 10 * 0.85);
near(c.netPerSale(11, { commission: 0.15, taxIncluded: true, taxRate: 10 }).tax, 1);

// ceilDiv + subRates
assert.strictEqual(c.ceilDiv(99, 4.2415), 24);
assert.strictEqual(c.ceilDiv(100, 50), 2);
assert.strictEqual(c.ceilDiv(0, 5), 0);
assert.strictEqual(c.ceilDiv(5, 0), 0);
assert.deepStrictEqual(JSON.parse(JSON.stringify(c.subRates(0.30))), { year1: 0.30, year2: 0.15 });
assert.deepStrictEqual(JSON.parse(JSON.stringify(c.subRates(0.15))), { year1: 0.15, year2: 0.15 });

// One-time: revenue only in the purchase month
const once = { model: 'once', commission: 0.15 };
near(c.valuePerCustomer(4.99, once, 36), 4.99 * 0.85);
c.simulate(4.99, once, 200).forEach(v => near(v, 200 * 4.99 * 0.85));

// Monthly sub, no churn, 30%: 12*7 + 12*8.5 = 186 over 24 months
const mo = { model: 'monthly', commission: 0.30, retention: 1 };
near(c.valuePerCustomer(10, mo, 24), 186);
// Churn lowers value
assert.ok(c.valuePerCustomer(10, { model: 'monthly', commission: 0.15, retention: 0.92 }, 12) < 12 * 8.5);
// Month 13 with 2 arrivals/mo: ages 0..12 -> 12*7 + 1*8.5 = 92.5 per arrival
near(c.simulate(10, mo, 2)[12], 185);

// Annual sub: bills at age 0 and 12; year-2 rate applies to the renewal
const an = { model: 'annual', commission: 0.30, retention: 1 };
near(c.valuePerCustomer(120, an, 24), 120 * 0.7 + 120 * 0.85);
near(c.valuePerCustomer(120, an, 36), 120 * 0.7 + 120 * 0.85 + 120 * 0.85);
// 50% renewal rate
near(c.valuePerCustomer(120, { model: 'annual', commission: 0.30, retention: 0.5 }, 24), 120 * 0.7 + 0.5 * 120 * 0.85);

// Standard program, VAT included, monthly: tax stripped before commission
near(c.perCustomer(12, { model: 'monthly', commission: 0.30, retention: 1, taxIncluded: true, taxRate: 20 }, 0), 10 * 0.7);

// paybackMonth
assert.strictEqual(c.paybackMonth([50, 50, 50], 99), 2);
assert.strictEqual(c.paybackMonth([10, 10], 99), null);

// customersNeeded: once, $4.99 at 15%, $1000/mo -> ceil(1000/4.2415) = 236
assert.strictEqual(c.customersNeeded(4.99, once, 1000, 12), 236);
// Subscriptions build up: needing the same goal at month 24 takes fewer arrivals than at month 12
assert.ok(c.customersNeeded(10, mo, 1000, 24) < c.customersNeeded(10, mo, 1000, 12));
// Exactness: the solved arrival rate actually meets the goal in that month
const need = c.customersNeeded(10, mo, 1000, 12);
assert.ok(c.simulate(10, mo, need)[11] >= 1000 && c.simulate(10, mo, need - 1)[11] < 1000);

console.log('calc tests passed');
