import { VSCodeLink, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { Eye, EyeOff } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { formatString } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import { useDebounceEffect } from "@/utils/useDebounceEffect"

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
}: ApiKeyFieldProps) => {
	const tr = useTranslation("providers")
	const [localValue, setLocalValue] = useState(initialValue)
	const [showKey, setShowKey] = useState(false)
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

	return (
		<div>
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
				style={{ width: "100%" }}
				type={showKey ? "text" : "password"}
				value={localValue}>
				<span style={{ fontWeight: 500 }}>{label ?? formatString(tr, "apiKeyLabel", { provider: providerName })}</span>
				<span
					aria-label={showKey ? tr("apiKeyHideLabel") : tr("apiKeyShowLabel")}
					data-testid="api-key-visibility-toggle"
					onClick={() => setShowKey((visible) => !visible)}
					onKeyDown={(event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault()
							setShowKey((visible) => !visible)
						}
					}}
					role="button"
					slot="end"
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						height: "100%",
						padding: "0 6px",
						cursor: "pointer",
					}}
					tabIndex={0}
					title={showKey ? tr("apiKeyHideLabel") : tr("apiKeyShowLabel")}>
					{showKey ? <EyeOff aria-hidden size={14} /> : <Eye aria-hidden size={14} />}
				</span>
			</VSCodeTextField>
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
