import { VSCodeLink, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useEffect, useRef, useState } from "react"
import { formatString } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import { useDebounceEffect } from "@/utils/useDebounceEffect"
import { SavedApiKeyCopyButton } from "./SavedApiKeyCopyButton"

/**
 * Props for the ApiKeyField component
 */
interface ApiKeyFieldProps {
	initialValue: string
	onChange: (value: string) => void
	providerName: string
	signupUrl?: string
	placeholder?: string
	helpText?: string
	label?: string
	/** Asks the host to copy the saved key. Shown only while a key is saved (non-empty initialValue). */
	onCopySavedKey?: () => Promise<unknown>
}

/**
 * A reusable component for API key input fields with standard styling and help text for signing up for key
 */
export const ApiKeyField = ({
	initialValue,
	onChange,
	providerName,
	signupUrl,
	placeholder,
	helpText,
	label,
	onCopySavedKey,
}: ApiKeyFieldProps) => {
	const tr = useTranslation("providers")
	const [localValue, setLocalValue] = useState(initialValue)
	const isFocusedRef = useRef(false)
	const hasPendingUserEditRef = useRef(false)
	const prevInitialValueRef = useRef(initialValue)

	useEffect(() => {
		if (prevInitialValueRef.current === initialValue) {
			return
		}

		prevInitialValueRef.current = initialValue

		// API key saves can update the masked initial value while the user is still typing.
		// Do not replace their in-progress input with the new mask, or subsequent saves only
		// persist the suffix typed after that rerender.
		if (!isFocusedRef.current) {
			hasPendingUserEditRef.current = false
			setLocalValue(initialValue)
		}
	}, [initialValue])

	useDebounceEffect(
		() => {
			if (!hasPendingUserEditRef.current) {
				return
			}

			hasPendingUserEditRef.current = false
			onChange(localValue)
		},
		100,
		[localValue],
	)

	const canCopySavedKey = Boolean(onCopySavedKey && initialValue)

	return (
		<div>
			<div style={{ display: "flex", alignItems: "stretch", gap: 4 }}>
				<VSCodeTextField
					onBlur={() => {
						isFocusedRef.current = false
					}}
					onFocus={() => {
						isFocusedRef.current = true
					}}
					onInput={(e) => {
						hasPendingUserEditRef.current = true
						setLocalValue((e.target as HTMLInputElement | null)?.value ?? "")
					}}
					placeholder={placeholder ?? tr("apiKeyPlaceholder")}
					required={true}
					style={{ flex: 1, minWidth: 0, width: "100%" }}
					type="password"
					value={localValue}>
					<span style={{ fontWeight: 500 }}>
						{label ?? formatString(tr, "apiKeyLabel", { provider: providerName })}
					</span>
				</VSCodeTextField>
				{canCopySavedKey && onCopySavedKey && (
					<SavedApiKeyCopyButton onCopy={onCopySavedKey} providerName={providerName} testId="api-key-copy-saved" />
				)}
			</div>
			<p
				style={{
					fontSize: "12px",
					marginTop: 3,
					color: "var(--vscode-descriptionForeground)",
				}}>
				{helpText || tr("apiKeyHelp")}
				{!localValue && signupUrl && (
					<VSCodeLink
						href={signupUrl}
						style={{
							display: "inline",
							fontSize: "inherit",
						}}>
						{formatString(tr, "apiKeySignup", { provider: providerName })}
					</VSCodeLink>
				)}
			</p>
		</div>
	)
}
