import { Check, Copy } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "@/i18n/useTranslation"

interface SavedApiKeyCopyButtonProps {
	/** Copies the SAVED key: the host reads it and writes the clipboard, so the webview never receives the secret. */
	onCopy: () => Promise<unknown>
	providerName: string
	/** Test id for the e2e specs that click this control. */
	testId?: string
}

const COPIED_FEEDBACK_MS = 1500

/**
 * The copy control that belongs beside a key field whose saved value the webview only knows
 * as a mask: it asks the host to put the real key on the clipboard, shows a tick for a
 * moment, and never reveals the secret in the form.
 *
 * Shared by `ApiKeyField` and by the provider forms that own their own text field (LiteLLM,
 * OpenRouter) — a masked key field must offer the same control wherever it appears, which is
 * what this component exists to keep true.
 */
export const SavedApiKeyCopyButton = ({ onCopy, providerName, testId }: SavedApiKeyCopyButtonProps) => {
	const tr = useTranslation("providers")
	const [copied, setCopied] = useState(false)

	useEffect(() => {
		if (!copied) {
			return
		}
		const timer = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
		return () => window.clearTimeout(timer)
	}, [copied])

	const handleCopy = () => {
		onCopy()
			.then(() => setCopied(true))
			.catch((err) => console.error(`Failed to copy ${providerName} API key:`, err))
	}

	return (
		<>
			<button
				aria-label={tr("apiKeyCopyLabel")}
				className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--vscode-focusBorder)]"
				data-testid={testId}
				onClick={handleCopy}
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					flexShrink: 0,
					width: 30,
					background: "var(--vscode-button-secondaryBackground)",
					color: "var(--vscode-button-secondaryForeground)",
					border: "1px solid var(--vscode-button-border, transparent)",
					borderRadius: 3,
					cursor: "pointer",
				}}
				title={copied ? tr("apiKeyCopiedLabel") : tr("apiKeyCopyLabel")}
				type="button">
				{copied ? <Check aria-hidden size={16} /> : <Copy aria-hidden size={16} />}
			</button>
			{/* The tick is silent: this is the confirmation a screen reader hears. */}
			<span aria-live="polite" className="sr-only" role="status">
				{copied ? tr("apiKeyCopiedLabel") : ""}
			</span>
		</>
	)
}
