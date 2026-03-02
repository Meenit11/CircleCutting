import { hexPack, gridPack, detectLeftoverZones, suggestForZone } from '../lib/packing.js';

export function optimizeRoute(req, res) {
    try {
        const {
            length,
            width,
            radius,
            kerf = 2,
            edgeMargin = 5,
            packing = 'hex',
            suggestLeftovers = true,
            minSuggestRadius = 3,
            exactCount = null,
        } = req.body;

        // Validate inputs
        if (!length || !width || !radius) {
            return res.status(400).json({ error: 'length, width, and radius are required' });
        }
        if (length <= 0 || width <= 0 || radius <= 0) {
            return res.status(400).json({ error: 'All dimensions must be positive' });
        }
        if (radius * 2 > Math.min(length, width)) {
            return res.status(400).json({ error: 'Circle diameter exceeds sheet dimensions' });
        }

        // Run packing algorithm
        const packFn = packing === 'grid' ? gridPack : hexPack;
        let circles = packFn(length, width, radius, kerf, edgeMargin);

        // If exact count requested, limit circles
        if (exactCount && exactCount > 0 && exactCount < circles.length) {
            circles = circles.slice(0, exactCount);
        }

        // Calculate stats
        const circleArea = circles.length * Math.PI * radius * radius;
        const totalArea = length * width;
        const efficiency = (circleArea / totalArea) * 100;

        // Detect leftover zones
        let leftoverZones = [];
        if (suggestLeftovers && circles.length > 0) {
            leftoverZones = detectLeftoverZones(length, width, circles, radius, kerf, edgeMargin);

            // Generate suggestions for each zone
            for (const zone of leftoverZones) {
                zone.suggestions = suggestForZone(zone, radius, minSuggestRadius, kerf, edgeMargin);
            }
        }

        // Calculate waste
        const wasteArea = totalArea - circleArea;

        res.json({
            circles,
            leftoverZones,
            stats: {
                count: circles.length,
                circleArea: round2(circleArea),
                totalArea: round2(totalArea),
                efficiency: round2(efficiency),
                wasteArea: round2(wasteArea),
                packing,
                radius,
                kerf,
                edgeMargin,
            },
        });
    } catch (err) {
        console.error('Optimize error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

function round2(n) {
    return Math.round(n * 100) / 100;
}
