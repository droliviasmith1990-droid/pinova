/**
 * Jest Setup File
 * 
 * Provides global mocks and setup for tests.
 */

// Mock localStorage for Zustand persist middleware
const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
        getItem: (key: string): string | null => {
            return store[key] || null;
        },
        setItem: (key: string, value: string): void => {
            store[key] = value;
        },
        removeItem: (key: string): void => {
            delete store[key];
        },
        clear: (): void => {
            store = {};
        },
        get length(): number {
            return Object.keys(store).length;
        },
        key: (index: number): string | null => {
            const keys = Object.keys(store);
            return keys[index] || null;
        },
    };
})();

// Assign to global
Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

// Also mock sessionStorage just in case
Object.defineProperty(global, 'sessionStorage', {
    value: localStorageMock,
    writable: true,
});

// Clear storage before each test to ensure isolation
beforeEach(() => {
    localStorageMock.clear();
});
