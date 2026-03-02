import { create } from 'zustand';

const STORAGE_KEY = 'circle-cutting-jobs';

function loadRecentJobs() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveRecentJobs(jobs) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(0, 10)));
    } catch { }
}

export const useStore = create((set, get) => ({
    // Navigation
    currentScreen: 'home', // home | arScan | manualEntry | circleConfig | results
    setScreen: (screen) => set({ currentScreen: screen }),

    // Sheet dimensions
    sheet: {
        shape: 'rectangle', // rectangle | square
        length: '',
        width: '',
        edgeMargin: 5,
        kerf: 2,
    },
    setSheet: (updates) => set((s) => ({ sheet: { ...s.sheet, ...updates } })),

    // Circle config
    circleConfig: {
        radius: '',
        mode: 'maximize', // maximize | exact
        exactCount: '',
        packing: 'hex', // hex | grid
        suggestLeftovers: true,
        minSuggestRadius: 3,
    },
    setCircleConfig: (updates) => set((s) => ({ circleConfig: { ...s.circleConfig, ...updates } })),

    // Results
    results: null,
    setResults: (results) => set({ results }),

    // Selected leftover suggestions { zoneId: suggestionIndex }
    selectedSuggestions: {},
    selectSuggestion: (zoneId, index) => set((s) => {
        const current = s.selectedSuggestions[zoneId];
        if (current === index) {
            // Deselect
            const next = { ...s.selectedSuggestions };
            delete next[zoneId];
            return { selectedSuggestions: next };
        }
        return { selectedSuggestions: { ...s.selectedSuggestions, [zoneId]: index } };
    }),
    clearSuggestions: () => set({ selectedSuggestions: {} }),

    // Recent jobs
    recentJobs: loadRecentJobs(),
    saveJob: () => {
        const state = get();
        if (!state.results) return;

        const { selectedSuggestions, results } = state;
        let totalExtra = 0;
        let extraArea = 0;
        if (results.leftoverZones) {
            for (const zone of results.leftoverZones) {
                const selIdx = selectedSuggestions[zone.id];
                if (selIdx !== undefined && zone.suggestions[selIdx]) {
                    totalExtra += zone.suggestions[selIdx].count;
                    extraArea += zone.suggestions[selIdx].area;
                }
            }
        }

        const totalCircles = results.stats.count + totalExtra;
        const totalCircleArea = results.stats.circleArea + extraArea;
        const efficiency = ((totalCircleArea / results.stats.totalArea) * 100).toFixed(1);

        const job = {
            id: Date.now().toString(),
            length: Number(state.sheet.length),
            width: Number(state.sheet.width),
            radius: Number(state.circleConfig.radius),
            totalCircles,
            efficiency: Number(efficiency),
            timestamp: new Date().toISOString(),
        };

        const jobs = [job, ...get().recentJobs].slice(0, 10);
        saveRecentJobs(jobs);
        set({ recentJobs: jobs });
    },
    loadJob: (job) => {
        set({
            sheet: { shape: 'rectangle', length: job.length.toString(), width: job.width.toString(), edgeMargin: 5, kerf: 2 },
            circleConfig: { radius: job.radius.toString(), mode: 'maximize', exactCount: '', packing: 'hex', suggestLeftovers: true, minSuggestRadius: 3 },
            currentScreen: 'circleConfig',
            results: null,
            selectedSuggestions: {},
        });
    },

    // Reset
    reset: () => set({
        currentScreen: 'home',
        sheet: { shape: 'rectangle', length: '', width: '', edgeMargin: 5, kerf: 2 },
        circleConfig: { radius: '', mode: 'maximize', exactCount: '', packing: 'hex', suggestLeftovers: true, minSuggestRadius: 3 },
        results: null,
        selectedSuggestions: {},
    }),
}));
