import { CheckCheckIcon, CopyIcon } from "lucide-react"
import { forwardRef, useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/i18n/useTranslation"
import { cn } from "@/lib/utils"

interface CopyButtonProps {
	textToCopy?: string
	onCopy?: () => string | undefined | null
	className?: string
	/** Overrides the translated default name; use it when the context is not obvious. */
	ariaLabel?: string
}

interface WithCopyButtonProps {
	children: React.ReactNode
	textToCopy?: string
	onCopy?: () => string | undefined | null
	position?: "top-right" | "bottom-right"
	style?: React.CSSProperties
	className?: string
	copyButtonClassname?: string
	onMouseUp?: (event: React.MouseEvent<HTMLDivElement>) => void
	ariaLabel?: string
}

const COPIED_TIMEOUT = 1500

const POSITION_CLASSES = {
	"top-right": "top-5 right-5",
	"bottom-right": "bottom-1 right-2",
} as const

/**
 * Base copy button component with clipboard functionality.
 *
 * Accessibility contract, because these controls sit on top of the text they copy:
 * the accessible name comes from the translator (not a hardcoded "Copy"), a `role=status`
 * line announces the confirmation for screen readers (the tick alone is visual), and the
 * control is a plain `type="button"` so it can never submit a surrounding form.
 */
export const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy, onCopy, className, ariaLabel }) => {
	const tr = useTranslation("quickStart")
	const [copied, setCopied] = useState(false)

	const handleCopy = useCallback(() => {
		const text = onCopy?.() || textToCopy
		if (!text) {
			return
		}

		navigator.clipboard
			.writeText(text)
			.then(() => {
				setCopied(true)
				setTimeout(() => setCopied(false), COPIED_TIMEOUT)
			})
			.catch((err) => console.error("Copy failed", err))
	}, [textToCopy, onCopy])

	const label = ariaLabel ?? tr("copyLabel")

	return (
		<>
			<Button
				aria-label={label}
				className={cn("scale-90", className)}
				onClick={handleCopy}
				size="icon"
				title={copied ? tr("copiedLabel") : label}
				type="button"
				variant="icon">
				{copied ? <CheckCheckIcon aria-hidden className="size-2" /> : <CopyIcon aria-hidden className="size-2" />}
			</Button>
			{/* The tick is silent; this is what a screen reader actually hears after copying. */}
			<span aria-live="polite" className="sr-only" role="status">
				{copied ? tr("copiedLabel") : ""}
			</span>
		</>
	)
}

/**
 * Container component that wraps content with a copy button
 */
export const WithCopyButton = forwardRef<HTMLDivElement, WithCopyButtonProps>(
	(
		{
			children,
			textToCopy,
			onCopy,
			position = "top-right",
			style,
			className,
			copyButtonClassname,
			onMouseUp,
			ariaLabel,
			...props
		},
		ref,
	) => {
		const hasCopyFunctionality = !!(textToCopy || onCopy)

		return (
			<div className={cn("group relative w-full", className)} onMouseUp={onMouseUp} ref={ref} style={style} {...props}>
				{hasCopyFunctionality && (
					<div
						className={cn(
							// Hidden until hover *or* keyboard focus: a button that only appears on
							// hover is still tabbable, so a keyboard user would land on nothing visible.
							"absolute opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100",
							POSITION_CLASSES[position],
							copyButtonClassname,
						)}>
						<CopyButton ariaLabel={ariaLabel} onCopy={onCopy} textToCopy={textToCopy} />
					</div>
				)}
				{children}
			</div>
		)
	},
)

WithCopyButton.displayName = "WithCopyButton"
