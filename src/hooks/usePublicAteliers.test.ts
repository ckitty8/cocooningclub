import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { lireCacheAteliers } from "./usePublicAteliers";

const CLE = "cc_ateliers_publics_v1:id, titre";

describe("mémoire des ateliers publics", () => {
  beforeEach(() => window.localStorage.clear());
  it("rien en mémoire : null", () => {
    expect(lireCacheAteliers("id, titre", "2026-11-17")).toBeNull();
  });
  it("rend la liste gardée sans les ateliers passés", () => {
    window.localStorage.setItem(CLE, JSON.stringify({ le: Date.now(), ateliers: [
      { id: "a", titre: "Passé", date_atelier: "2026-11-10" },
      { id: "b", titre: "À venir", date_atelier: "2026-11-20" },
    ] }));
    expect(lireCacheAteliers("id, titre", "2026-11-17")?.map(a => a.id)).toEqual(["b"]);
  });
  it("ignore une mémoire trop ancienne ou abîmée", () => {
    window.localStorage.setItem(CLE, JSON.stringify({ le: Date.now() - 30 * 86400000, ateliers: [{ id: "b", date_atelier: "2026-11-20" }] }));
    expect(lireCacheAteliers("id, titre", "2026-11-17")).toBeNull();
    window.localStorage.setItem(CLE, "{pas du json");
    expect(lireCacheAteliers("id, titre", "2026-11-17")).toBeNull();
  });
});
