/**
 * History Store Tests
 * 
 * Tests for undo/redo functionality with canvas state snapshots.
 */

import { useHistoryStore, HistorySnapshot } from '../historyStore';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/types/editor';

// Helper to reset store between tests
const resetStore = () => {
    useHistoryStore.setState({
        history: [{
            elements: [],
            canvasSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
            backgroundColor: '#FFFFFF',
        }],
        historyIndex: 0,
        maxHistory: 50,
    });
};

// Helper to create a test snapshot
const createSnapshot = (overrides: Partial<HistorySnapshot> = {}): HistorySnapshot => ({
    elements: [],
    canvasSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    backgroundColor: '#FFFFFF',
    ...overrides,
});

describe('historyStore', () => {
    beforeEach(() => {
        resetStore();
    });

    describe('initial state', () => {
        it('should have one initial snapshot', () => {
            const { history, historyIndex } = useHistoryStore.getState();
            expect(history).toHaveLength(1);
            expect(historyIndex).toBe(0);
        });

        it('should not be able to undo initially', () => {
            expect(useHistoryStore.getState().canUndo()).toBe(false);
        });

        it('should not be able to redo initially', () => {
            expect(useHistoryStore.getState().canRedo()).toBe(false);
        });
    });

    describe('pushSnapshot', () => {
        it('should add a new snapshot to history', () => {
            const { pushSnapshot } = useHistoryStore.getState();
            const snapshot = createSnapshot({ backgroundColor: '#FF0000' });

            pushSnapshot(snapshot);

            const { history, historyIndex } = useHistoryStore.getState();
            expect(history).toHaveLength(2);
            expect(historyIndex).toBe(1);
            expect(history[1].backgroundColor).toBe('#FF0000');
        });

        it('should clone snapshot to prevent mutations', () => {
            const { pushSnapshot } = useHistoryStore.getState();
            const elements = [{ id: '1', name: 'Test' }];
            const snapshot = createSnapshot({ elements: elements as any });

            pushSnapshot(snapshot);

            // Mutate original
            elements[0].name = 'Mutated';

            // History should not be affected
            const { history } = useHistoryStore.getState();
            expect(history[1].elements[0].name).toBe('Test');
        });

        it('should truncate future history when making new changes', () => {
            const { pushSnapshot, undo } = useHistoryStore.getState();

            // Push two snapshots
            pushSnapshot(createSnapshot({ backgroundColor: '#111111' }));
            pushSnapshot(createSnapshot({ backgroundColor: '#222222' }));

            // Undo once
            undo();

            // Push new snapshot (should truncate the #222222 snapshot)
            pushSnapshot(createSnapshot({ backgroundColor: '#333333' }));

            const { history, historyIndex } = useHistoryStore.getState();
            expect(history).toHaveLength(3);
            expect(historyIndex).toBe(2);
            expect(history[2].backgroundColor).toBe('#333333');
        });

        it('should respect maxHistory limit', () => {
            useHistoryStore.setState({ maxHistory: 3 });
            const { pushSnapshot } = useHistoryStore.getState();

            // Push more than max
            pushSnapshot(createSnapshot({ backgroundColor: '#111111' }));
            pushSnapshot(createSnapshot({ backgroundColor: '#222222' }));
            pushSnapshot(createSnapshot({ backgroundColor: '#333333' }));
            pushSnapshot(createSnapshot({ backgroundColor: '#444444' }));

            const { history } = useHistoryStore.getState();
            expect(history).toHaveLength(3);
            // First items should be dropped
            expect(history[0].backgroundColor).toBe('#222222');
        });
    });

    describe('undo', () => {
        it('should return previous snapshot', () => {
            const { pushSnapshot } = useHistoryStore.getState();
            pushSnapshot(createSnapshot({ backgroundColor: '#FF0000' }));

            const snapshot = useHistoryStore.getState().undo();

            expect(snapshot).not.toBeNull();
            expect(snapshot?.backgroundColor).toBe('#FFFFFF');
        });

        it('should decrement historyIndex', () => {
            const { pushSnapshot } = useHistoryStore.getState();
            pushSnapshot(createSnapshot());
            pushSnapshot(createSnapshot());

            useHistoryStore.getState().undo();

            expect(useHistoryStore.getState().historyIndex).toBe(1);
        });

        it('should return null when cannot undo', () => {
            const snapshot = useHistoryStore.getState().undo();
            expect(snapshot).toBeNull();
        });

        it('should enable redo after undo', () => {
            const { pushSnapshot } = useHistoryStore.getState();
            pushSnapshot(createSnapshot());

            useHistoryStore.getState().undo();

            expect(useHistoryStore.getState().canRedo()).toBe(true);
        });
    });

    describe('redo', () => {
        it('should return next snapshot after undo', () => {
            const { pushSnapshot } = useHistoryStore.getState();
            pushSnapshot(createSnapshot({ backgroundColor: '#FF0000' }));

            useHistoryStore.getState().undo();
            const snapshot = useHistoryStore.getState().redo();

            expect(snapshot).not.toBeNull();
            expect(snapshot?.backgroundColor).toBe('#FF0000');
        });

        it('should increment historyIndex', () => {
            const { pushSnapshot } = useHistoryStore.getState();
            pushSnapshot(createSnapshot());

            useHistoryStore.getState().undo();
            useHistoryStore.getState().redo();

            expect(useHistoryStore.getState().historyIndex).toBe(1);
        });

        it('should return null when cannot redo', () => {
            const snapshot = useHistoryStore.getState().redo();
            expect(snapshot).toBeNull();
        });
    });

    describe('canUndo / canRedo', () => {
        it('canUndo should be true when historyIndex > 0', () => {
            const { pushSnapshot } = useHistoryStore.getState();
            pushSnapshot(createSnapshot());

            expect(useHistoryStore.getState().canUndo()).toBe(true);
        });

        it('canRedo should be true after undo', () => {
            const { pushSnapshot } = useHistoryStore.getState();
            pushSnapshot(createSnapshot());
            useHistoryStore.getState().undo();

            expect(useHistoryStore.getState().canRedo()).toBe(true);
        });

        it('canRedo should be false at latest state', () => {
            const { pushSnapshot } = useHistoryStore.getState();
            pushSnapshot(createSnapshot());

            expect(useHistoryStore.getState().canRedo()).toBe(false);
        });
    });

    describe('getCurrentSnapshot', () => {
        it('should return current snapshot', () => {
            const { pushSnapshot } = useHistoryStore.getState();
            pushSnapshot(createSnapshot({ backgroundColor: '#FF0000' }));

            const snapshot = useHistoryStore.getState().getCurrentSnapshot();

            expect(snapshot?.backgroundColor).toBe('#FF0000');
        });

        it('should return cloned snapshot', () => {
            const snapshot1 = useHistoryStore.getState().getCurrentSnapshot();
            const snapshot2 = useHistoryStore.getState().getCurrentSnapshot();

            expect(snapshot1).not.toBe(snapshot2);
        });
    });

    describe('resetHistory', () => {
        it('should reset to single initial snapshot', () => {
            const { pushSnapshot, resetHistory } = useHistoryStore.getState();
            pushSnapshot(createSnapshot());
            pushSnapshot(createSnapshot());

            resetHistory();

            const { history, historyIndex } = useHistoryStore.getState();
            expect(history).toHaveLength(1);
            expect(historyIndex).toBe(0);
        });

        it('should use provided snapshot as initial', () => {
            const { resetHistory } = useHistoryStore.getState();
            resetHistory(createSnapshot({ backgroundColor: '#123456' }));

            const { history } = useHistoryStore.getState();
            expect(history[0].backgroundColor).toBe('#123456');
        });
    });

    describe('initializeWithSnapshot', () => {
        it('should set history to single snapshot', () => {
            const { initializeWithSnapshot } = useHistoryStore.getState();
            initializeWithSnapshot(createSnapshot({ backgroundColor: '#ABCDEF' }));

            const { history, historyIndex } = useHistoryStore.getState();
            expect(history).toHaveLength(1);
            expect(historyIndex).toBe(0);
            expect(history[0].backgroundColor).toBe('#ABCDEF');
        });
    });
});
