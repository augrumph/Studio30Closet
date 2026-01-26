
export function calculateAnchorPrice(currentPrice) {
    if (!currentPrice) return 0;

    let multiplier = 1.20; // Default fallback

    if (currentPrice <= 79.90) multiplier = 1.40;
    else if (currentPrice <= 99.90) multiplier = 1.35;
    else if (currentPrice <= 129.90) multiplier = 1.30;
    else if (currentPrice <= 159.90) multiplier = 1.28;
    else if (currentPrice <= 199.90) multiplier = 1.25;
    else if (currentPrice <= 249.90) multiplier = 1.22;
    else multiplier = 1.20;

    let anchor = currentPrice * multiplier;

    // Logic to round to .90
    // Math.floor(anchor) gives integer part.
    // We want the final decimal to be .90.
    // So we can round to nearest integer and subtract 0.10? 
    // Or just floor and add 0.90?
    // Let's try: Floor the number, then add 0.90. 
    // Example: 119.90 * 1.30 = 155.87 -> Floor 155 -> 155.90.

    // However, if the result is like 155.05, maybe we want 154.90?
    // Let's keep it simple: Math.ceil(anchor) - 0.10 usually works well for prices ending in .90

    // User examples:
    // 69.90 -> 97.90 (69.9 * 1.4 = 97.86 -> 97.90)
    // 89.90 -> 121.90 (89.9 * 1.35 = 121.365 -> 121.90)

    // It seems consistent to take the integer part and add 0.90?
    // 89.90 * 1.35 = 121.365. Int = 121. Result = 121.90.
    // 119.90 * 1.30 = 155.87. Int = 155. Result = 155.90.

    return Math.floor(anchor) + 0.90;
}

export function calculateInstallment(price) {
    if (!price) return 0;
    return price / 3;
}
