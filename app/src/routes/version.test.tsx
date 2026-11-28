import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { version } from "../../package.json";
import { ApplicationRoutes } from "./app-routes";
import type { IndexedDbRepository } from "../storage/indexed-db-repository";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.removeItem("cyndy.locale");
});

it("shows the packaged version beside CYNDY offline while preserving header controls", async () => {
  window.localStorage.setItem("cyndy.locale", "en");
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  const fetchSpy = vi.spyOn(window, "fetch");
  const repository = {
    getCurrencyConfigurations: vi.fn().mockResolvedValue([]),
    saveCurrencyConfigurations: vi.fn().mockResolvedValue(undefined),
    listCounts: vi.fn().mockResolvedValue([]),
  } as unknown as IndexedDbRepository;
  render(<ApplicationRoutes repository={repository} />);
  const brand = await screen.findByRole("link", { name: "CYNDY home", description: `v${version}` });
  expect(brand.getAttribute("href")).toBe("/");
  expect(brand.textContent).toContain(`CYNDY v${version}`);
  expect(fetchSpy).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Change language" }));
  const spanishBrand = screen.getByRole("link", { name: "Inicio de CYNDY", description: `v${version}` });
  expect(spanishBrand.getAttribute("href")).toBe("/");
  expect(spanishBrand.textContent).toContain(`CYNDY v${version}`);
});
