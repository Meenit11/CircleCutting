/**
 * Circle packing algorithms for sheet metal optimization.
 * All dimensions in mm.
 */

/**
 * Hex packing (offset rows) — ~15% more circles than grid.
 */
export function hexPack(sheetLength, sheetWidth, radius, kerf, margin) {
    const circles = [];
    const effectiveRadius = radius + kerf / 2;
    const diameter = effectiveRadius * 2;
    const rowHeight = effectiveRadius * Math.sqrt(3); // vertical distance between row centers

    const startX = margin + effectiveRadius;
    const startY = margin + effectiveRadius;
    const endX = sheetLength - margin - effectiveRadius;
    const endY = sheetWidth - margin - effectiveRadius;

    let row = 0;
    let y = startY;

    while (y <= endY) {
        const isOffsetRow = row % 2 === 1;
        const xOffset = isOffsetRow ? effectiveRadius : 0;
        let x = startX + xOffset;

        while (x <= endX) {
            circles.push({ x: round2(x), y: round2(y), r: radius });
            x += diameter;
        }

        y += rowHeight;
        row++;
    }

    return circles;
}

/**
 * Grid packing — simple rows and columns.
 */
export function gridPack(sheetLength, sheetWidth, radius, kerf, margin) {
    const circles = [];
    const effectiveRadius = radius + kerf / 2;
    const diameter = effectiveRadius * 2;

    const startX = margin + effectiveRadius;
    const startY = margin + effectiveRadius;
    const endX = sheetLength - margin - effectiveRadius;
    const endY = sheetWidth - margin - effectiveRadius;

    let y = startY;
    while (y <= endY) {
        let x = startX;
        while (x <= endX) {
            circles.push({ x: round2(x), y: round2(y), r: radius });
            x += diameter;
        }
        y += diameter;
    }

    return circles;
}

/**
 * Detect leftover rectangular zones after primary circle placement.
 * Returns approximate rectangular strips (right strip, bottom strip, corners).
 */
export function detectLeftoverZones(sheetLength, sheetWidth, circles, radius, kerf, margin) {
    if (circles.length === 0) return [];

    const effectiveRadius = radius + kerf / 2;

    // Find the bounding box of placed circles
    let maxCircleX = 0;
    let maxCircleY = 0;

    for (const c of circles) {
        const right = c.x + effectiveRadius;
        const bottom = c.y + effectiveRadius;
        if (right > maxCircleX) maxCircleX = right;
        if (bottom > maxCircleY) maxCircleY = bottom;
    }

    const zones = [];

    // Right strip: from maxCircleX to sheetLength
    const rightStripWidth = sheetLength - maxCircleX - margin;
    const rightStripHeight = sheetWidth - 2 * margin;
    if (rightStripWidth > 3 && rightStripHeight > 3) {
        zones.push({
            id: 'zone-right',
            label: 'Right Strip',
            x: round2(maxCircleX),
            y: round2(margin),
            width: round2(rightStripWidth),
            height: round2(rightStripHeight),
            polygon: [
                { x: round2(maxCircleX), y: round2(margin) },
                { x: round2(sheetLength - margin), y: round2(margin) },
                { x: round2(sheetLength - margin), y: round2(sheetWidth - margin) },
                { x: round2(maxCircleX), y: round2(sheetWidth - margin) },
            ],
            suggestions: [],
        });
    }

    // Bottom strip: from maxCircleY to sheetWidth (only up to maxCircleX to avoid overlap with right strip)
    const bottomStripWidth = maxCircleX - margin;
    const bottomStripHeight = sheetWidth - maxCircleY - margin;
    if (bottomStripHeight > 3 && bottomStripWidth > 3) {
        zones.push({
            id: 'zone-bottom',
            label: 'Bottom Strip',
            x: round2(margin),
            y: round2(maxCircleY),
            width: round2(bottomStripWidth),
            height: round2(bottomStripHeight),
            polygon: [
                { x: round2(margin), y: round2(maxCircleY) },
                { x: round2(maxCircleX), y: round2(maxCircleY) },
                { x: round2(maxCircleX), y: round2(sheetWidth - margin) },
                { x: round2(margin), y: round2(sheetWidth - margin) },
            ],
            suggestions: [],
        });
    }

    // Bottom-Right corner (if both strips exist, there's a corner zone)
    if (rightStripWidth > 3 && bottomStripHeight > 3) {
        // This is already covered by right strip's full height, so skip to avoid double counting
    }

    return zones;
}

/**
 * Suggest smaller circles for a leftover zone.
 * Tries decreasing radii from (primaryRadius - 1) down to minRadius.
 * Returns top 3 options ranked by count.
 */
export function suggestForZone(zone, primaryRadius, minRadius, kerf, margin) {
    const suggestions = [];

    // Try various radii from close to primary down to minimum
    const step = Math.max(1, Math.floor((primaryRadius - minRadius) / 8));
    const radiiToTry = [];

    for (let r = primaryRadius - 1; r >= minRadius; r -= step) {
        radiiToTry.push(r);
    }
    if (radiiToTry[radiiToTry.length - 1] !== minRadius) {
        radiiToTry.push(minRadius);
    }

    // Also try some specific fractions of primary radius
    const halfR = Math.round(primaryRadius / 2);
    const thirdR = Math.round(primaryRadius / 3);
    const quarterR = Math.round(primaryRadius / 4);
    for (const r of [halfR, thirdR, quarterR]) {
        if (r >= minRadius && r < primaryRadius && !radiiToTry.includes(r)) {
            radiiToTry.push(r);
        }
    }

    radiiToTry.sort((a, b) => b - a);

    for (const r of radiiToTry) {
        if (r < minRadius) continue;

        const circles = hexPack(zone.width, zone.height, r, kerf, 0);

        // Offset circles to zone position
        const positioned = circles.map(c => ({
            x: round2(c.x + zone.x),
            y: round2(c.y + zone.y),
            r: c.r,
        }));

        if (positioned.length > 0) {
            suggestions.push({
                radius: r,
                count: positioned.length,
                circles: positioned,
                area: round2(positioned.length * Math.PI * r * r),
            });
        }
    }

    // Remove duplicates (same count), keep unique, sort by count desc, take top 3
    const seen = new Set();
    const unique = [];
    for (const s of suggestions) {
        const key = `${s.count}-${s.radius}`;
        if (!seen.has(s.count)) {
            seen.add(s.count);
            unique.push(s);
        }
    }

    unique.sort((a, b) => b.count - a.count || b.radius - a.radius);
    return unique.slice(0, 3);
}

function round2(n) {
    return Math.round(n * 100) / 100;
}
