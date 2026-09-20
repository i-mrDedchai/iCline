/**
 * menuPopover — the iCline menu-surface conventions, in ONE place.
 *
 * The rounds of 2026-09-20 settled three rules for every popover that hangs off a button
 * in a pane the user can resize (the model picker, the composer's Options popover, and
 * whatever comes next):
 *
 *  1. **Anchor on the trigger's LEFT edge while the pane can hold the menu there.** The
 *     left edge is the rule because the menu should open out of the button that was
 *     clicked; the older right-edge anchoring is kept only as the fallback for a pane too
 *     squeezed for it, so a narrow sidebar still shows the whole menu instead of losing it
 *     off the side of the pane. That decision is `pickMenuPopoverAlign`.
 *  2. **The whole menu is a click surface.** The pointer shows the hand over the headers,
 *     the gaps and the readouts too, not only the clickable rows — plain `<button>`
 *     elements get the OS arrow, while VSCodeButton (the four icons under the chat input)
 *     gets the hand by itself, so the menu body has to say so: `MENU_SURFACE_CLASS`.
 *  3. **A field inside a menu keeps the text caret.** The search box is the one thing you
 *     type into: `MENU_TEXT_FIELD_CLASS`.
 *
 * `useMenuPopoverAnchor` is rules 1 and 2's plumbing for React callers. `menuPopover.guard.test.ts`
 * reads the source of every menu surface and fails when one of them skips a rule — the
 * conventions are only worth documenting if a new surface cannot quietly ignore them.
 */
import { type RefObject, useCallback, useEffect, useState } from "react"

/**
 * Which edge of its trigger a menu hangs from: `start` puts the menu's LEFT edge on the
 * trigger's left edge, `end` puts its RIGHT edge on the trigger's right edge.
 */
export type MenuPopoverAlign = "start" | "end"

/** Breathing room kept between the menu's far edge and the pane's edge. */
export const MENU_POPOVER_VIEWPORT_MARGIN_PX = 8

/**
 * Every menu body carries this: the hand over the whole menu, not just its rows. Cursor
 * INHERITS, so putting it on the wrapper is what covers the headers, the gaps between
 * rows and any readout that is not itself a button; `disabled:cursor-not-allowed` still
 * wins on the elements that are disabled.
 */
export const MENU_SURFACE_CLASS = "cursor-pointer"

/** A field inside a menu — the one place that is typed into rather than clicked. */
export const MENU_TEXT_FIELD_CLASS = "cursor-text"

/**
 * Alignment for a menu hung off a trigger, honouring BOTH anchoring rules (maintainer
 * request, 2026-09-20: "make the left edge the main rule, but keep the way it was for a
 * squeezed chat pane — support both").
 *
 * `start` is the primary rule: the menu opens from the button that was clicked, so its
 * left edge sits on the button's left edge. It is only given up when the menu cannot fit
 * there (VS Code's default sidebar ~300px against the 236px Options panel), where the
 * right-edge anchoring takes over. Radix still nudges whatever it finally renders back
 * into view; this decides which edge the menu is anchored to on the way there.
 */
export function pickMenuPopoverAlign(params: {
	/** Left edge of the trigger, in viewport coordinates. */
	triggerLeft: number
	/** Width of the pane the menu has to stay inside. */
	viewportWidth: number
	/** How wide the menu body will be — needed before it has rendered. */
	panelWidth: number
	marginPx?: number
}): MenuPopoverAlign {
	const margin = params.marginPx ?? MENU_POPOVER_VIEWPORT_MARGIN_PX
	return params.triggerLeft + params.panelWidth + margin <= params.viewportWidth ? "start" : "end"
}

export interface MenuPopoverAnchorParams {
	/** Whether the menu is currently open (drives the resize re-measure). */
	open: boolean
	/** The state setter the Radix `Popover` is controlled with. */
	setOpen: (open: boolean) => void
	/** The element the menu hangs off. Measured from the TRIGGER, never from the menu. */
	triggerRef: RefObject<HTMLElement | null>
	/** Width of the menu body — the decision needs it before anything has rendered. */
	panelWidth: number
	marginPx?: number
}

/**
 * Anchor a menu to a button inside a pane that can be resized.
 *
 * Measured from the TRIGGER, not from the menu: the menu's own geometry is only known
 * after Radix has positioned it, and correcting the edge then would flash the menu on the
 * wrong side first. `onOpenChange` therefore decides the edge in the same tick as the open
 * flag, so the first paint is already correct, and a `resize` listener re-decides while
 * the menu is up — dragging the sidebar is exactly how a user reaches the narrow case.
 */
export function useMenuPopoverAnchor({ open, setOpen, triggerRef, panelWidth, marginPx }: MenuPopoverAnchorParams) {
	const [align, setAlign] = useState<MenuPopoverAlign>("start")

	const measure = useCallback(() => {
		const trigger = triggerRef.current
		if (!trigger) {
			return
		}
		setAlign(
			pickMenuPopoverAlign({
				triggerLeft: trigger.getBoundingClientRect().left,
				viewportWidth: window.innerWidth || Number.MAX_SAFE_INTEGER,
				panelWidth,
				marginPx,
			}),
		)
	}, [marginPx, panelWidth, triggerRef])

	useEffect(() => {
		if (!open) {
			return
		}
		window.addEventListener("resize", measure)
		return () => window.removeEventListener("resize", measure)
	}, [open, measure])

	/** Radix `onOpenChange`: decide the edge, then flip the flag the caller controls. */
	const onOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (nextOpen) {
				measure()
			}
			setOpen(nextOpen)
		},
		[measure, setOpen],
	)

	return { align, measure, onOpenChange }
}
