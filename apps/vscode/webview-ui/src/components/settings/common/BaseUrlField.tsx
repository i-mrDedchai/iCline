import { VSCodeCheckbox, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useEffect, useState } from "react"
import { useDebouncedInput } from "../utils/useDebouncedInput"

/**
 * Props for the BaseUrlField component
 */
interface BaseUrlFieldProps {
	initialValue: string | undefined
	onChange: (value: string) => void
	defaultValue?: string
	label?: string
	placeholder?: string
	disabled?: boolean
	showLockIcon?: boolean
}

/**
 * A reusable component for toggling and entering custom base URLs.
 *
 * The checkbox state (enabled/disabled) syncs with `initialValue` when it
 * arrives asynchronously (e.g. from `useProviderConfig` RPC). Without the
 * `useEffect`, `useState(!!initialValue)` would only read the value on
 * mount, when config is still `undefined`, so the checkbox would never
 * appear checked even when a URL is stored.
 */
export const BaseUrlField = ({
	initialValue,
	onChange,
	label = "Use custom base URL",
	placeholder = "Default: https://api.example.com",
	disabled = false,
	showLockIcon = false,
}: BaseUrlFieldProps) => {
	const [isEnabled, setIsEnabled] = useState(!!initialValue)
	const [localValue, setLocalValue] = useDebouncedInput(initialValue || "", onChange)

	// Sync checkbox state when initialValue arrives/changes asynchronously
	// (e.g. useProviderConfig RPC returns after mount).
	useEffect(() => {
		setIsEnabled(!!initialValue)
	}, [initialValue])

	const handleToggle = (e: any) => {
		const checked = e.target.checked === true
		setIsEnabled(checked)
		if (!checked) {
			setLocalValue("")
			onChange("")
		}
	}

	return (
		<div>
			<div className="flex items-center gap-2">
				<VSCodeCheckbox checked={isEnabled} disabled={disabled} onChange={handleToggle}>
					{label}
				</VSCodeCheckbox>
				{showLockIcon && <i className="codicon codicon-lock text-(--vscode-descriptionForeground) text-sm" />}
			</div>

			{isEnabled && (
				<VSCodeTextField
					disabled={disabled}
					onInput={(e: any) => setLocalValue(e.target.value.trim())}
					placeholder={placeholder}
					style={{ width: "100%", marginTop: 3 }}
					type="text"
					value={localValue}
				/>
			)}
		</div>
	)
}
