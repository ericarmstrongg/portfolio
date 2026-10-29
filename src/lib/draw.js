// Secret Santa draw. Givers are adults; receivers are adults + kids. Every receiver is gifted exactly once,
// so when receivers outnumber givers some givers draw more than one person.

function shuffle(a, rand) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * @param {{adults: {id:string}[], kids: {id:string, parents:string[]}[], exclude?: string[][]}} roster
 * @returns {{giver:string, receiver:string}[]}  throws if constraints are unsatisfiable.
 */
export function draw({ adults, kids, exclude = [] }, rand = Math.random) {
  const givers = adults.map((a) => a.id);
  const receivers = [...adults.map((a) => a.id), ...kids.map((k) => k.id)];
  const banned = new Set();
  const ban = (g, r) => banned.add(`${g}>${r}`);
  for (const id of givers) ban(id, id);
  for (const k of kids) for (const p of k.parents) ban(p, k.id);
  for (const [a, b] of exclude) { ban(a, b); ban(b, a); }

  const cap = Math.ceil(receivers.length / givers.length);
  for (let attempt = 0; attempt < 2000; attempt++) {
    // Pick which givers get an extra recipient, then fill slots: each giver has base or base+1 slots.
    const base = Math.floor(receivers.length / givers.length);
    const extra = receivers.length - base * givers.length;
    const order = shuffle([...givers], rand);
    const slots = new Map(order.map((g, i) => [g, base + (i < extra ? 1 : 0)]));
    const out = [];
    let ok = true;
    for (const r of shuffle([...receivers], rand)) {
      const choices = givers.filter((g) => slots.get(g) > 0 && !banned.has(`${g}>${r}`));
      if (!choices.length) { ok = false; break; }
      const g = choices[Math.floor(rand() * choices.length)];
      slots.set(g, slots.get(g) - 1);
      out.push({ giver: g, receiver: r });
    }
    if (ok) return out;
  }
  throw new Error(`draw unsatisfiable (cap ${cap})`);
}
