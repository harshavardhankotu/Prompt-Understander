import { describe, it, expect } from "vitest";

// Replicate server calculation function
function calcFees(totalAmount: number) {
  const platformFeePercent = 2.0;
  const platformFeeAmount = Math.round(totalAmount * platformFeePercent / 100);
  const tdsAmount = totalAmount > 30000 ? Math.round(totalAmount * 0.02) : 0;
  const netToProvider = totalAmount - platformFeeAmount - tdsAmount;
  return { platformFeePercent, platformFeeAmount, tdsAmount, netToProvider };
}

describe("Financial Math & Escrow Rounding Audit", () => {
  it("should calculate clean integer fees and paise for an odd-numbered bid", () => {
    const bidAmount = 45333; // Odd-number bid

    const { platformFeeAmount, tdsAmount, netToProvider } = calcFees(bidAmount);

    // 1. Verify platform fee is rounded to integer rupees
    // 45333 * 0.02 = 906.66 -> Rounded: 907
    expect(platformFeeAmount).toBe(907);
    expect(Number.isInteger(platformFeeAmount)).toBe(true);

    // 2. Verify TDS is rounded to integer rupees
    // 45333 * 0.02 = 906.66 -> Rounded: 907
    expect(tdsAmount).toBe(907);
    expect(Number.isInteger(tdsAmount)).toBe(true);

    // 3. Verify Net to provider is an integer
    expect(netToProvider).toBe(43519);
    expect(Number.isInteger(netToProvider)).toBe(true);

    // 4. Verify Razorpay payload (amount in paise) is a clean integer with no decimals
    const totalAmountWithFee = bidAmount + platformFeeAmount;
    const amountInPaise = Math.round(totalAmountWithFee * 100);

    expect(amountInPaise).toBe(4624000); // 46240 * 100
    expect(Number.isInteger(amountInPaise)).toBe(true);
  });
});
