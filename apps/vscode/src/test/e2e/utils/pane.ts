/**
 * The pane the chat webview lives in — driven the way a user drives it.
 *
 * VS Code opens the view in a ~300px sidebar, which is narrower than the composer row needs:
 * the model chip's truncated name ends up over the Plan/Act switch and swallows the click
 * (`chat.test.ts` failed on exactly that, in the same way every run). Rather than bending
 * the assertions around a pane nobody works in, the tests that care ask for a pane the
 * maintainer would recognise — the ~900px width the 2026-09-20 UXUI requests came from.
 *
 * Two pieces, both needed:
 *  1. **the window** — VS Code's default window cannot hold a 900px pane, so widen it first
 *     (`BrowserWindow.setSize`, which is why this helper needs the ElectronApplication);
 *  2. **the pane** — drag VS Code's own sash, the same gesture a user makes. Nothing here
 *     clicks inside the webview, so a popover that is already open survives the drag and
 *     gets to re-decide its anchor while the pane moves (which is how the Options popover's
 *     `resize` path is covered on a real window).
 *
 * The pane's identity is read from the FRAME STACK, not from a part id or the webview's own
 * `id` query parameter: VS Code nests the webview two iframes deep, re-creates it when a view
 * changes parts, and decides for itself which part hosts the view. The harness runs it in the
 * primary sidebar, but a user can move it — `location()` says where it is right now, and
 * `moveToAuxiliaryBar()` moves it there through VS Code's own UI so that the moved case can
 * be tested. All three (the sash, the location, the move) share one primitive: step out of
 * the frame stack to the webview's element and ask the workbench about it.
 */
import { type ElectronApplication, type ElementHandle, expect, type Frame, type Locator, type Page } from "@playwright/test"

/** A window this size can hold a 900px pane plus a usable editor. */
export const PANE_WIDE_WINDOW = { width: 1800, height: 1000 } as const

/** The pane width the tests that ask for a wide pane aim at (~the maintainer's working pane). */
export const PANE_WIDE_WIDTH_PX = 900

/** How far a candidate sash may sit from the webview's edge and still be its pane's. */
const SASH_EDGE_TOLERANCE_PX = 40

/** Which workbench part hosts the view. */
export type PaneLocation = "sidebar" | "auxiliarybar" | "panel"

/** VS Code's own words for the flow `moveToAuxiliaryBar` drives. */
const COMMAND_PALETTE_PLACEHOLDER = "Type the name of a command to run"
/** The palette's mode prefix. `fill("")` drops it and the palette becomes the file picker. */
const COMMAND_PALETTE_PREFIX = ">"
const MOVE_VIEW_QUERY = "Move View"
const MOVE_VIEW_LABEL = "View: Move View"
/** The activity bar container the chat's view is contributed into (`viewsContainers`). */
const CHAT_VIEW_CONTAINER = "iCline"
const PICK_A_VIEW_PLACEHOLDER = "Select a View to Move"
const PICK_A_DESTINATION_PLACEHOLDER = "Select a Destination for the View"
const NEW_SECONDARY_SIDE_BAR_ENTRY = "New Secondary Side Bar Entry"

/** How long the webview's focus grab takes to land (measured ~500ms after a turn ends). */
const FOCUS_GRAB_WINDOW_MS = 800

export interface PaneController {
	/** Current inner width of the webview pane, in CSS px. */
	measure(): Promise<number>
	/**
	 * Widen the pane to at least `targetWidth` (default `PANE_WIDE_WIDTH_PX`) by giving the
	 * window room and dragging the pane's sash. Returns the width reached; throws when the
	 * drag cannot get there, so a silently-narrow pane cannot make a test pass vacuously.
	 */
	widenTo(targetWidth?: number): Promise<number>
	/** Which workbench part hosts the chat right now (null if it cannot be traced). */
	location(): Promise<PaneLocation | null>
	/**
	 * Move the view to the Secondary Side Bar the way a user does it — VS Code's own
	 * "View: Move View" flow, not a DOM move — and return the frame the chat lives in
	 * afterwards, because moving between parts can replace the webview's frame.
	 */
	moveToAuxiliaryBar(): Promise<Frame>
}

/** Escapes a label before it goes into a `RegExp` built from it. */
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export function createPaneController({
	app,
	page,
	sidebar,
	resolveSidebar,
}: {
	app: ElectronApplication
	page: Page
	/** The chat webview's frame. */
	sidebar: Frame
	/** Returns the chat webview's frame again after it may have been re-created. */
	resolveSidebar: () => Promise<Frame>
}): PaneController {
	/** The frame the chat lives in right now — a move between parts can replace it. */
	const current = async (): Promise<Frame> => resolveSidebar().catch(() => sidebar)

	/**
	 * The workbench's own webview `<iframe>` element for the frame we drive.
	 *
	 * One step out of the frame stack: the frame is the webview's inner `#active-frame`, its
	 * parent frame is the webview's document, and that document's `frameElement()` is the
	 * workbench element VS Code laid the webview out with. This is deliberately not "the
	 * `id` in some outer iframe's `src`": a view that is moved between parts can be given a
	 * new webview, and then a remembered id points at nothing.
	 */
	const findWebviewElement = async (frame: Frame): Promise<ElementHandle<Element> | null> => {
		const webviewDocument = frame.parentFrame()
		if (!webviewDocument) {
			return null
		}
		return (await webviewDocument.frameElement().catch(() => null)) as ElementHandle<Element> | null
	}

	/**
	 * Which part hosts the view, by GEOMETRY rather than ancestry: VS Code lays a webview out
	 * in a top-level overlay layer (the workbench's `.part.*` elements are not among its
	 * ancestors — verified on 1.138), so the part the webview is laid out OVER is the answer.
	 */
	const locationOf = async (frame: Frame): Promise<PaneLocation | null> => {
		const webview = await findWebviewElement(frame)
		if (!webview) {
			return null
		}
		return (await webview.evaluate((node) => {
			const rect = node.getBoundingClientRect()
			const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
			const parts: [string, PaneLocation][] = [
				["workbench.parts.sidebar", "sidebar"],
				["workbench.parts.auxiliarybar", "auxiliarybar"],
				["workbench.parts.panel", "panel"],
			]
			for (const [id, location] of parts) {
				const part = document.getElementById(id)
				if (!part) {
					continue
				}
				const partRect = part.getBoundingClientRect()
				if (partRect.width === 0 || partRect.height === 0) {
					continue // the part exists but is not shown (a hidden side bar has no box)
				}
				if (
					center.x >= partRect.left &&
					center.x <= partRect.right &&
					center.y >= partRect.top &&
					center.y <= partRect.bottom
				) {
					return location
				}
			}
			return null
		})) as PaneLocation | null
	}

	const ensureWindowRoom = async () => {
		await app.evaluate(({ BrowserWindow }, size) => {
			const window = BrowserWindow.getAllWindows()[0]
			if (!window) {
				return
			}
			const [width, height] = window.getSize()
			if (width < size.width || height < size.height) {
				window.setSize(Math.max(width, size.width), Math.max(height, size.height))
			}
		}, PANE_WIDE_WINDOW)
	}

	/** Where the pane's own sash sits right now, and which way it has to move to grow the pane. */
	const findSash = async () => {
		const host = await findWebviewElement(await current())
		expect(host, "the chat webview could not be traced back to a workbench element").not.toBeNull()
		const paneRect = await (host as ElementHandle<Element>).evaluate((node) => {
			const rect = node.getBoundingClientRect()
			return { left: rect.left, right: rect.right }
		})
		return page.evaluate(
			({ paneRect, tolerance }) => {
				let best: { x: number; y: number; distance: number; growsRight: boolean } | null = null
				for (const element of document.querySelectorAll(".monaco-sash")) {
					const rect = element.getBoundingClientRect()
					// Horizontal sashes belong to the panel/editor, and a `disabled` one marks a
					// boundary that cannot be dragged at all.
					if (rect.height <= rect.width || element.classList.contains("disabled")) {
						continue
					}
					const x = rect.left + rect.width / 2
					const toLeft = Math.abs(x - paneRect.left)
					const toRight = Math.abs(x - paneRect.right)
					const distance = Math.min(toLeft, toRight)
					if (distance > tolerance || (best && distance >= best.distance)) {
						continue
					}
					best = { x, y: rect.top + rect.height / 2, distance, growsRight: toRight < toLeft }
				}
				return best
			},
			{ paneRect, tolerance: SASH_EDGE_TOLERANCE_PX },
		)
	}

	/**
	 * The quick input (command palette or a picker behind a command) that is showing
	 * `placeholder`. VS Code reuses one widget for all of them, so `Move View` hands the same
	 * box from the palette to two pickers in a row — the placeholder is how each step is
	 * pinned to the picker it belongs to.
	 */
	const quickInput = async (placeholder: string) => {
		const input = page.locator(".quick-input-box input").first()
		await input.waitFor({ state: "visible", timeout: 15_000 })
		await expect(input).toHaveAttribute("placeholder", new RegExp(placeholder))
		return input
	}

	/**
	 * Writes `text` into the open quick input.
	 *
	 * `fill`, not keystrokes: VS Code hides its quick input when that input loses focus, and the
	 * chat webview reaches for focus on its own — on a run where a turn had just completed, a
	 * `pressSequentially("Move View")` query came out as `>Move V` with the palette already closed,
	 * so the step timed out looking for a row that was never filtered in. A real user never sees
	 * this (their keystrokes follow the OS focus; ours are addressed to an element). `fill` writes
	 * the whole value in one event, so the query cannot be cut short.
	 *
	 * The value has to carry what the user would have typed: the palette's own `>` prefix is its
	 * mode, so the caller passes it and nothing ever fills an empty string.
	 */
	const type = (input: Locator, text: string) => input.fill(text)

	/** True while the quick input is actually on screen — VS Code hides it but keeps the DOM. */
	const quickInputIsShown = () =>
		page
			.locator(".quick-input-widget")
			.evaluate((widget) => (widget as HTMLElement).offsetParent !== null)
			.catch(() => false)

	/**
	 * Opens the command palette with `query` written into it and returns its input, re-opening it
	 * while the chat webview takes focus back.
	 *
	 * VS Code hides its quick input the moment that input loses focus, and the chat's composer
	 * re-focuses itself whenever a turn ends (`ChatView`, ~50ms after the turn goes idle) so a
	 * user can keep typing. A palette opened inside that window closes on its own with the query
	 * sitting in a hidden box — measured on a real run: the webview's `<iframe>` held focus and
	 * the widget was hidden within 500ms of the query being written, which is what made this step
	 * time out looking for a row that had been filtered in correctly. A user would just press F1
	 * again; this does the same until the palette stays put.
	 */
	const typeInPalette = async (query: string) => {
		for (let attempt = 1; attempt <= 3; attempt++) {
			await page.keyboard.press("F1")
			const input = await quickInput(COMMAND_PALETTE_PLACEHOLDER)
			await type(input, query)
			await page.waitForTimeout(FOCUS_GRAB_WINDOW_MS)
			if (await quickInputIsShown()) {
				return input
			}
		}
		throw new Error(`the command palette would not stay open with "${query}" in it`)
	}

	/** The rows of the open quick pick, for failure messages. */
	const visibleRows = async () =>
		page
			.locator('.monaco-list-row[role="option"]')
			.evaluateAll((rows) => rows.map((row) => row.getAttribute("aria-label") ?? "").filter(Boolean))

	/**
	 * Clicks the quick pick row whose accessible name starts with `label` — the list ITEM, not
	 * the label element inside it. VS Code renders two `.quick-input-list-row` elements per item
	 * (one of them zero-height, with a content-sized width), which is not reliably clickable; the
	 * `role="option"` row carries the whole hit area and the label as its name.
	 *
	 * Matched at the start rather than exactly, because a row that opens a group carries the
	 * group's separator too ("New Secondary Side Bar Entry, Secondary Side Bar"). Accepting the
	 * top match instead is not the same thing: a `Move View` query ranks
	 * `Move Panel Views To Secondary Side Bar` and `Move Secondary Side Bar Views To Panel`
	 * above `View: Move View`.
	 *
	 * A row that is missing fails with what the picker did show: a filtered-out row is otherwise
	 * a bare timeout that says nothing about why.
	 */
	const clickRow = async (label: string) => {
		const row = page.getByRole("option", { name: new RegExp(`^${escapeRegExp(label)}(,|$)`) })
		try {
			await row.first().click({ timeout: 10_000 })
		} catch (error) {
			const reason = error instanceof Error ? error.message.split("\n")[0] : String(error)
			throw new Error(
				`no quick pick row named "${label}" (${reason}). The picker showed: ${JSON.stringify(await visibleRows())}`,
			)
		}
	}

	/**
	 * Accepts the view picker's row for the chat view.
	 *
	 * The view is contributed with an EMPTY name (`contributes.views`), so its row has no
	 * label to type and nothing to pre-select it either: opening the palette is what blurs the
	 * view, so `focusedView` is empty by the time `Move View` runs and its picker has no
	 * selected item. What identifies the row is the group it starts — a picker row carries its
	 * group's separator label, which for a sidebar view reads "Side Bar / <container>" (the
	 * chat is the only view in its container, so it starts its group). On VS Code 1.138 the
	 * row's own accessible label comes out as ", Side Bar / iCline" (the leading comma is the
	 * empty view name), which is what the selector below matches. Verified against the DOM.
	 */
	const acceptUnlabelledViewRow = async (container: string) => {
		const row = page.locator(`.monaco-list-row[role="option"][aria-label*="Side Bar / ${container}"]`)
		await expect(row, `no row for the ${container} view in the Move View picker`).toHaveCount(1)
		await row.click()
	}

	return {
		measure: async () => (await current()).evaluate(() => window.innerWidth),
		location: async () => locationOf(await current()),
		async widenTo(targetWidth = PANE_WIDE_WIDTH_PX) {
			let width = await (await current()).evaluate(() => window.innerWidth)
			if (width >= targetWidth) {
				return width
			}
			await ensureWindowRoom()
			for (let attempt = 0; attempt < 3 && width < targetWidth; attempt++) {
				const sash = await findSash()
				expect(sash, "no draggable sash at the edge of the chat pane").not.toBeNull()
				const handle = sash as { x: number; y: number; growsRight: boolean }
				const delta = (targetWidth - width) * (handle.growsRight ? 1 : -1)
				await page.mouse.move(handle.x, handle.y)
				await page.mouse.down()
				await page.mouse.move(handle.x + delta, handle.y, { steps: 15 })
				await page.mouse.up()

				const next = await (await current()).evaluate(() => window.innerWidth)
				if (next === width) {
					break // the drag was ignored, or the pane hit its own maximum
				}
				width = next
			}
			if (width < targetWidth) {
				throw new Error(
					`chat pane stuck at ${width}px (wanted ${targetWidth}px) — is the window as large as ${PANE_WIDE_WINDOW.width}x${PANE_WIDE_WINDOW.height}?`,
				)
			}
			return width
		},
		async moveToAuxiliaryBar() {
			const startedIn = await locationOf(await current())

			// A user's route, through VS Code's own UI: `View: Move View`, then answer its two
			// pickers. The keyboard goes to whatever has focus and the previous step clicked inside
			// the webview, so hand focus back to the workbench chrome before pressing F1.
			await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
			await typeInPalette(COMMAND_PALETTE_PREFIX + MOVE_VIEW_QUERY)
			await clickRow(MOVE_VIEW_LABEL)

			await quickInput(PICK_A_VIEW_PLACEHOLDER)
			await acceptUnlabelledViewRow(CHAT_VIEW_CONTAINER)
			const destination = await quickInput(PICK_A_DESTINATION_PLACEHOLDER)
			await type(destination, NEW_SECONDARY_SIDE_BAR_ENTRY)
			await clickRow(NEW_SECONDARY_SIDE_BAR_ENTRY)

			// The move is only real once the part hosting the webview changed. The webview can be
			// rebuilt on the way, so re-resolve the frame while polling rather than once after.
			await expect
				.poll(async () => await locationOf(await current()).catch(() => null), {
					message: `the chat view should end up in the secondary side bar (it started in ${startedIn})`,
					timeout: 30_000,
				})
				.toBe("auxiliarybar")

			return current()
		},
	}
}
