# Bolt's Journal

## 2025-12-21 - Synchronization Complexity
**Learning:** O(N^2) lookups in synchronization loops (React <-> Canvas) are silent killers. Even if N is small (10-50), the frequency of execution (every render/store update) amplifies the cost.
**Action:** Always use Maps for ID-based lookups in synchronization logic.
