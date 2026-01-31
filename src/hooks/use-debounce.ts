import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useDebounce - Returns a debounced version of the provided value.
 * Useful for debouncing search inputs or other value-based updates.
 * 
 * @param value The value to debounce
 * @param delay Delay in milliseconds (default: 500)
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

/**
 * useDebouncedCallback - Returns a debounced version of the provided callback.
 * Useful for debouncing actions like scroll events or button clicks.
 * 
 * @param callback The function to debounce
 * @param delay Delay in milliseconds
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): (...args: Parameters<T>) => void {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const debouncedFn = useCallback((...args: Parameters<T>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return debouncedFn;
}
