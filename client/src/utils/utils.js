const API_URL = import.meta.env.VITE_API_URL || '';

export async function optimizeCircles(params) {
    const res = await fetch(`${API_URL}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Optimization failed');
    }
    return res.json();
}

export function formatNumber(n, decimals = 0) {
    if (n === null || n === undefined || isNaN(n)) return '0';
    return Number(n).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

export function formatArea(mm2) {
    if (mm2 >= 1_000_000) return `${(mm2 / 1_000_000).toFixed(2)} m²`;
    if (mm2 >= 10_000) return `${(mm2 / 100).toFixed(1)} cm²`;
    return `${mm2.toFixed(1)} mm²`;
}

export function formatDate(isoString) {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getEfficiencyColor(pct) {
    if (pct < 50) return '#d45050'; // muted red
    if (pct < 75) return '#d4a03c'; // warm amber
    return '#6dba7d'; // sage green
}
