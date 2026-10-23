import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Le paquet de migration totale (supabase/migration-totale) doit rester synchronisé avec les migrations.
describe("paquet de migration totale", () => {
  it("est à jour : migration-totale.sql correspond au manifeste et aucune migration récente n'est oubliée", () => {
    expect(() =>
      execFileSync("node", ["scripts/build-migration-package.mjs", "--verifier"], { stdio: "pipe" }),
    ).not.toThrow();
  });
});
