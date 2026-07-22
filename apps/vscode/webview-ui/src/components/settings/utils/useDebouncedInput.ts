import { useEffect, useRef, useState } from "react"
import { useDebounceEffect } from "@/utils/useDebounceEffect"

/**
 * A custom hook that provides debounced input handling to prevent jumpy text inputs
 * when saving changes directly to backend on every keystroke.
 *
 * @param initialValue - The initial value for the input
 * @param onChange - Callback function to save the value (e.g., to backend)
 * @param debounceMs - Debounce delay in milliseconds (default: 500ms)
 * @returns A tuple of [currentValue, setValue] similar to useState
 */
export function useDebouncedInput<T>(
	initialValue: T,
	onChange: (value: T) => void,
	debounceMs: number = 100,
): [T, (value: T) => void] {
	// Local state to prevent jumpy input - initialize once
	const [localValue, setLocalValue] = useState(initialValue)

	// Track previous initialValue to detect external changes
	const prevInitialValueRef = useRef<T>(initialValue)

	// Skip the first debounce fire on mount — the initial value is already
	// in storage, so calling onChange("") (or whatever the initial value is)
	// before config has loaded would overwrite the stored value.
	// This is critical for async-loaded configs (useProviderConfig RPC)
	// where the component mounts with initialValue=undefined and the real
	// value arrives later via a prop update.
	const skipNextFireRef = useRef(true)

	// Sync local state when initialValue changes externally (e.g., when switching Plan/Act tabs)
	useEffect(() => {
		if (prevInitialValueRef.current !== initialValue) {
			setLocalValue(initialValue)
			prevInitialValueRef.current = initialValue
			// External sync — don't write back to storage
			skipNextFireRef.current = true
		}
	}, [initialValue])

	// Debounced backend save - saves after user stops changing value
	useDebounceEffect(
		() => {
			if (skipNextFireRef.current) {
				skipNextFireRef.current = false
				return
			}
			onChange(localValue)
		},
		debounceMs,
		[localValue],
	)

	return [localValue, setLocalValue]
}
