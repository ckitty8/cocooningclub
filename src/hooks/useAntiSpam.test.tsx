import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAntiSpam } from "./useAntiSpam";

describe("useAntiSpam", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("considère comme robot un envoi en moins de 3 secondes", () => {
    const { result } = renderHook(() => useAntiSpam());
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.isBot()).toBe(true);
  });

  it("laisse passer un envoi humain après 3 secondes", () => {
    const { result } = renderHook(() => useAntiSpam());
    act(() => vi.advanceTimersByTime(3500));
    expect(result.current.isBot()).toBe(false);
  });

  it("repère le champ piège rempli, même après 3 secondes", () => {
    const { result } = renderHook(() => useAntiSpam());
    const { container } = render(<>{result.current.honeypot}</>);
    const piege = container.querySelector<HTMLInputElement>('input[name="site_web"]')!;
    act(() => {
      vi.advanceTimersByTime(5000);
      // onChange React : on passe par le setter natif pour déclencher l'événement.
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(piege, "http://spam.example");
      piege.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(result.current.isBot()).toBe(true);
  });

  it("relance le chrono à la réouverture du formulaire", () => {
    const { result } = renderHook(() => useAntiSpam());
    act(() => vi.advanceTimersByTime(5000));
    act(() => result.current.reset());
    expect(result.current.isBot()).toBe(true);
  });
});
