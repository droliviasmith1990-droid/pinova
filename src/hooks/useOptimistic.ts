import { useState, useCallback } from 'react';

/**
 * Optimistic UI update hook
 * Updates local state immediately, then syncs with server
 * Rolls back on error
 */
export function useOptimistic<T>(
    initialValue: T,
    onUpdate?: (newValue: T) => Promise<void>
): [
        T,
        (newValue: T | ((prev: T) => T)) => Promise<void>,
        boolean,
        string | null
    ] {
    const [value, setValue] = useState<T>(initialValue);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateValue = useCallback(async (newValue: T | ((prev: T) => T)) => {
        const previousValue = value;
        const actualNewValue = typeof newValue === 'function'
            ? (newValue as (prev: T) => T)(value)
            : newValue;

        // Optimistically update immediately
        setValue(actualNewValue);
        setError(null);

        if (onUpdate) {
            setIsUpdating(true);
            try {
                await onUpdate(actualNewValue);
            } catch (err) {
                // Rollback on error
                setValue(previousValue);
                setError(err instanceof Error ? err.message : 'Update failed');
            } finally {
                setIsUpdating(false);
            }
        }
    }, [value, onUpdate]);

    return [value, updateValue, isUpdating, error];
}

/**
 * Optimistic list management hook
 * Provides add, remove, update operations with optimistic UI
 */
export function useOptimisticList<T extends { id: string }>(
    initialItems: T[],
    onSync?: {
        onAdd?: (item: T) => Promise<T>;
        onRemove?: (id: string) => Promise<void>;
        onUpdate?: (item: T) => Promise<T>;
    }
) {
    const [items, setItems] = useState<T[]>(initialItems);
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    const addItem = useCallback(async (item: T) => {
        // Optimistically add
        setItems(prev => [...prev, item]);
        setPendingIds(prev => new Set(prev).add(item.id));
        setError(null);

        if (onSync?.onAdd) {
            try {
                const syncedItem = await onSync.onAdd(item);
                // Update with server response
                setItems(prev => prev.map(i => i.id === item.id ? syncedItem : i));
            } catch (err) {
                // Rollback
                setItems(prev => prev.filter(i => i.id !== item.id));
                setError(err instanceof Error ? err.message : 'Failed to add item');
            } finally {
                setPendingIds(prev => {
                    const next = new Set(prev);
                    next.delete(item.id);
                    return next;
                });
            }
        }
    }, [onSync]);

    const removeItem = useCallback(async (id: string) => {
        const removedItem = items.find(i => i.id === id);
        if (!removedItem) return;

        // Optimistically remove
        setItems(prev => prev.filter(i => i.id !== id));
        setPendingIds(prev => new Set(prev).add(id));
        setError(null);

        if (onSync?.onRemove) {
            try {
                await onSync.onRemove(id);
            } catch (err) {
                // Rollback
                setItems(prev => [...prev, removedItem]);
                setError(err instanceof Error ? err.message : 'Failed to remove item');
            } finally {
                setPendingIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            }
        }
    }, [items, onSync]);

    const updateItem = useCallback(async (updatedItem: T) => {
        const previousItem = items.find(i => i.id === updatedItem.id);
        if (!previousItem) return;

        // Optimistically update
        setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
        setPendingIds(prev => new Set(prev).add(updatedItem.id));
        setError(null);

        if (onSync?.onUpdate) {
            try {
                const syncedItem = await onSync.onUpdate(updatedItem);
                setItems(prev => prev.map(i => i.id === updatedItem.id ? syncedItem : i));
            } catch (err) {
                // Rollback
                setItems(prev => prev.map(i => i.id === updatedItem.id ? previousItem : i));
                setError(err instanceof Error ? err.message : 'Failed to update item');
            } finally {
                setPendingIds(prev => {
                    const next = new Set(prev);
                    next.delete(updatedItem.id);
                    return next;
                });
            }
        }
    }, [items, onSync]);

    const isPending = useCallback((id: string) => pendingIds.has(id), [pendingIds]);

    return {
        items,
        setItems,
        addItem,
        removeItem,
        updateItem,
        isPending,
        isAnyPending: pendingIds.size > 0,
        error,
        clearError: () => setError(null),
    };
}

/**
 * Optimistic toggle hook
 * For simple boolean states like favorites, likes, etc.
 */
export function useOptimisticToggle(
    initialValue: boolean,
    onToggle?: (newValue: boolean) => Promise<void>
): [boolean, () => Promise<void>, boolean] {
    const [value, setValue] = useState(initialValue);
    const [isToggling, setIsToggling] = useState(false);

    const toggle = useCallback(async () => {
        const previousValue = value;
        const newValue = !value;

        // Optimistically toggle
        setValue(newValue);

        if (onToggle) {
            setIsToggling(true);
            try {
                await onToggle(newValue);
            } catch {
                // Rollback
                setValue(previousValue);
            } finally {
                setIsToggling(false);
            }
        }
    }, [value, onToggle]);

    return [value, toggle, isToggling];
}
