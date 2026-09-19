/**
 * BalloonTooltip — the iCline hover affordance (iCline UI Guidelines, กฎที่ 1).
 *
 * Required behavior, all of it here so every surface behaves the same:
 *  - appears ABOVE the trigger, centered, with a downward-pointing arrow;
 *  - `shift` clamps it inside the viewport, and `flip` only moves it BELOW when
 *    there is genuinely no room above (never on a guess);
 *  - hides on scroll, including scrolls inside the popover's own list;
 *  - replaces native `title` everywhere, which the guidelines forbid.
 *
 * Positioning is delegated to floating-ui (`offset` + `shift` + `flip`) rather than
 * `:hover`/`mouseover` bookkeeping — the mock round that hand-rolled those saw the
 * tooltip flicker and vanish on the out-then-over event pair.
 *
 * The tooltip text is the caller's responsibility to translate; pass an already
 * resolved string from the string map, never a literal.
 */
import { arrow, autoUpdate, FloatingArrow, flip, offset, shift, useFloating, useHover, useInteractions } from "@floating-ui/react"
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react"

export interface BalloonTooltipProps {
	/** Already-translated tooltip text. */
	label: string
	/** Trigger. Wrapped in an inline-flex box so the balloon can anchor to it. */
	children: ReactNode
	/** Preferred side; `flip` switches to the other one only when this side has no room. */
	side?: "top" | "bottom"
	/** Render nothing extra (useful for capability icons that have no metadata yet). */
	disabled?: boolean
	/** Optional class for the inline wrapper (layout tweaks only). */
	className?: string
}

export function BalloonTooltip({ label, children, side = "top", disabled, className }: BalloonTooltipProps) {
	const [open, setOpen] = useState(false)
	const arrowRef = useRef<SVGSVGElement | null>(null)

	const { refs, floatingStyles, context, middlewareData } = useFloating({
		open: disabled ? false : open,
		onOpenChange: setOpen,
		placement: side,
		whileElementsMounted: autoUpdate,
		middleware: [
			offset(8),
			flip({ fallbackPlacements: [side === "top" ? "bottom" : "top"] }),
			shift({ padding: 8 }),
			arrow({ element: arrowRef }),
		],
	})

	const hover = useHover(context, { move: false, delay: { open: 120, close: 0 } })
	const { getReferenceProps, getFloatingProps } = useInteractions([hover])

	// Hide on scroll. Capture phase so scrolls from any nested container (the model
	// list) count too — the balloon is anchored to a row that is moving away.
	useEffect(() => {
		if (!open) {
			return
		}
		const close = () => setOpen(false)
		window.addEventListener("scroll", close, true)
		return () => window.removeEventListener("scroll", close, true)
	}, [open])

	if (disabled) {
		return <>{children}</>
	}

	const arrowX = middlewareData.arrow?.x
	const arrowY = middlewareData.arrow?.y

	return (
		<>
			<span className={className ?? "inline-flex items-center"} ref={refs.setReference} {...getReferenceProps()}>
				{children}
			</span>
			{open && (
				<div
					className="pointer-events-none z-50 max-w-[240px] rounded px-2 py-1 text-[11px] leading-snug shadow-md"
					ref={refs.setFloating}
					role="tooltip"
					style={
						{
							...floatingStyles,
							background: "var(--vscode-editorHoverWidget-background, var(--vscode-editor-background))",
							border: "1px solid var(--vscode-editorHoverWidget-border, var(--vscode-editorGroup-border))",
							color: "var(--vscode-editorHoverWidget-foreground, var(--vscode-foreground))",
						} as CSSProperties
					}
					{...getFloatingProps()}>
					{label}
					<FloatingArrow
						context={context}
						fill="var(--vscode-editorHoverWidget-background, var(--vscode-editor-background))"
						height={5}
						ref={arrowRef}
						stroke="var(--vscode-editorHoverWidget-border, var(--vscode-editorGroup-border))"
						strokeWidth={1}
						style={{ left: arrowX != null ? `${arrowX}px` : "", top: arrowY != null ? `${arrowY}px` : "" }}
						width={10}
					/>
				</div>
			)}
		</>
	)
}

export default BalloonTooltip
