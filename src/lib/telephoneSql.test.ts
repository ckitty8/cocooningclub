import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { TELEPHONE_REGEX } from "./preInscription";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

// La règle du téléphone existe côté site (zod) et côté base
// (private.telephone_valide). Ce test échoue si l'une des deux change seule.
describe("règle du téléphone", () => {
  it("est identique dans le formulaire et dans la migration SQL", () => {
    const sql = readFileSync("supabase/migrations/20261015000001_validation_et_limite_envois.sql", "utf8");
    const motifSql = sql.match(/telephone_valide\(p TEXT\)[\s\S]*?SELECT p ~ '([^']+)'/)?.[1];
    expect(motifSql).toBeDefined();
    expect(TELEPHONE_REGEX.source).toBe(motifSql);
  });
});
