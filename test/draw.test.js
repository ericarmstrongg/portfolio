import { test } from "node:test";
import assert from "node:assert/strict";
import { draw } from "../src/lib/draw.js";

const adults = ["rob","laura","luisa","tom","eric","kellie","anne","robbie","barbara","ian","jack"].map((id) => ({ id }));
const kids = [{ id: "margot", parents: ["tom", "luisa"] }, { id: "elodie", parents: ["kellie"] }];
const exclude = [["rob", "laura"]];

test("constraints hold over many draws", () => {
  for (let i = 0; i < 500; i++) {
    const rows = draw({ adults, kids, exclude });
    const ids = new Set(adults.map((a) => a.id));
    assert.equal(rows.length, 13);
    assert.deepEqual([...new Set(rows.map((r) => r.receiver))].sort(), [...ids, "margot", "elodie"].sort()); // each gifted once
    for (const r of rows) {
      assert.ok(ids.has(r.giver), "kids never give");
      assert.notEqual(r.giver, r.receiver);
      for (const k of kids) if (r.receiver === k.id) assert.ok(!k.parents.includes(r.giver), "not own child");
      assert.ok(!(r.giver === "rob" && r.receiver === "laura") && !(r.giver === "laura" && r.receiver === "rob"));
    }
    const per = {};
    rows.forEach((r) => (per[r.giver] = (per[r.giver] || 0) + 1));
    assert.ok(Object.values(per).every((n) => n === 1 || n === 2));
    assert.equal(Object.keys(per).length, 11); // every adult gives
  }
});
test("unsatisfiable throws", () => {
  assert.throws(() => draw({ adults: [{ id: "a" }], kids: [], exclude: [] }));
});
