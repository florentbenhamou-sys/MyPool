import { describe, expect, it } from "vitest";
import { PricingError, computeCustomerPrice, computeDiscountAmount } from "@/domain/pricing";
import { money } from "./helpers";

describe("computeCustomerPrice — la remise est un POURCENTAGE", () => {
  it("1000 avec 20 % de remise donne 800", () => {
    expect(money(computeCustomerPrice("1000", "20"))).toBe("800.00");
  });

  it("sans remise, le prix client est le prix catalogue", () => {
    expect(money(computeCustomerPrice("1250.50", "0"))).toBe("1250.50");
  });

  it("100 % de remise donne 0", () => {
    expect(money(computeCustomerPrice("999.99", "100"))).toBe("0.00");
  });

  it("arrondit au centime, demi supérieur", () => {
    // 99.99 × 0.875 = 87.49125 → 87.49 ; 10.05 × 0.5 = 5.025 → 5.03
    expect(money(computeCustomerPrice("99.99", "12.5"))).toBe("87.49");
    expect(money(computeCustomerPrice("10.05", "50"))).toBe("5.03");
  });

  it("n'utilise pas l'arithmétique flottante (0.1 + 0.2)", () => {
    expect(money(computeCustomerPrice("0.30", "0"))).toBe("0.30");
    expect(computeCustomerPrice("1000000000.10", "0").toString()).toBe("1000000000.1");
  });

  it("refuse une remise hors de 0..100 et un prix négatif", () => {
    expect(() => computeCustomerPrice("100", "101")).toThrow(PricingError);
    expect(() => computeCustomerPrice("100", "-1")).toThrow(PricingError);
    expect(() => computeCustomerPrice("-1", "0")).toThrow(PricingError);
  });

  it("calcule le montant de remise", () => {
    expect(money(computeDiscountAmount("1000", "800"))).toBe("200.00");
  });
});
