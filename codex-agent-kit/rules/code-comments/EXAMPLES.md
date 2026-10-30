# Code Comments Examples

Examples of comments that preserve useful intent and contracts without duplicating the code.

## 1. Public API with a non-obvious contract

### Good: Documents caller-relevant behavior

```typescript
/**
 * Apply an eligible coupon and return recalculated cart totals.
 *
 * Use this at checkout after product availability has been confirmed. The input
 * cart is not mutated.
 *
 * @param cart - Active cart containing at least one purchasable item.
 * @param couponCode - Customer-provided code; matching is case-insensitive.
 * @returns A new cart with discount and tax totals recalculated.
 * @throws {CouponNotFoundError} When no coupon matches the supplied code.
 * @throws {CouponNotApplicableError} When the cart fails coupon eligibility rules.
 */
export async function applyCouponToCart(
  cart: Cart,
  couponCode: string,
): Promise<Cart> {
  // Implementation omitted.
}
```

This comment describes immutability, call ordering, matching behavior, and errors. It does not repeat the TypeScript types.

### Bad: Repeats the signature and implementation

```typescript
/**
 * Apply a coupon.
 * @param cart - Cart.
 * @param couponCode - String coupon code.
 * @returns A Promise of Cart.
 */
export async function applyCouponToCart(
  cart: Cart,
  couponCode: string,
): Promise<Cart> {
  // Loop through coupons and apply the matching coupon.
}
```

## 2. Obvious private helper

### Good: Clear code needs no comment

```typescript
function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}
```

### Bad: Comment adds no information

```typescript
/** Normalize the coupon code. */
function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}
```

## 3. Non-obvious decision or workaround

### Good: Explains why the unusual code must remain

```typescript
// Safari versions before 16.4 do not implement AbortSignal.timeout(). Keep the
// fallback until those versions fall outside the browser support policy.
const timeoutSignal =
  typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(5_000)
    : createLegacyTimeoutSignal(5_000);
```

### Bad: Gives no evidence or removal condition

```typescript
// HACK: Do not change this.
const timeoutSignal = createLegacyTimeoutSignal(5_000);
```

## 4. Python contract and constraints

### Good: Adds semantic details not expressed by annotations

```python
def calculate_compound_interest(
    principal: Decimal,
    annual_rate: Decimal,
    compounding_periods: int,
    years: int,
) -> Decimal:
    """Return the future balance using periodic compound interest.

    Use this calculation for quoted balances that require currency-safe decimal
    arithmetic. Rates are decimal fractions, so ``Decimal("0.05")`` means 5%.

    Args:
        principal: Opening balance; must be greater than zero.
        annual_rate: Non-negative nominal annual rate.
        compounding_periods: Number of compounding intervals per year; must be positive.
        years: Investment duration in whole years; must be at least one.

    Returns:
        The balance rounded to the configured currency precision.

    Raises:
        ValueError: If any input violates the stated range.
    """
    # Implementation omitted.
```

The docstring explains units, ranges, precision, and failure behavior instead of repeating Python type annotations.
