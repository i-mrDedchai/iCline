/**
 * The width of the pane the chat webview lives in — driven the way a user drives it.
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
 * The sash is found from the WEBVIEW'S OWN identity (the `id` query parameter its outer
 * `<iframe>` shares with the frame we drive), never from a part id: VS Code nests the webview
 * two iframes deep and decides for itself which part hosts the view (the harness runs it in
 * the primary sidebar; a user can move it to the auxiliary bar — both must work).
 */
import { type ElectronApplication, expect, type Frame, type Page } from "@playwright/test"

/** A window this size can hold a 900px pane plus a usable editor. */
export const PANE_WIDE_WINDOW = { width: 1800, height: 1000 } as const

/** The pane width the tests that ask for a wide pane aim at (~the maintainer's working pane). */
export const PANE_WIDE_WIDTH_PX = 900

/** How far a candidate sash may sit from the webview's edge and still be its pane's. */
const SASH_EDGE_TOLERANCE_PX = 40

export interface PaneController {
	/** Current inner width of the webview pane, in CSS px. */
	measure(): Promise<number>
	/**
	 * Widen the pane to at least `targetWidth` (default `PANE_WIDE_WIDTH_PX`) by giving the
	 * window room and dragging the pane's sash. Returns the width reached; throws when the
	 * drag cannot get there, so a silently-narrow pane cannot make a test pass vacuously.
	 */
	widenTo(targetWidth?: number): Promise<number>
}

export function createPaneController({
	app,
	page,
	sidebar,
}: {
	app: ElectronApplication
	page: Page
	sidebar: Frame
}): PaneController {
	const measure = () => sidebar.evaluate(() => window.innerWidth)

	/** The webview's `id` — the only reliable handle on our pane in the workbench document. */
	const webviewId = () => new URL(sidebar.url()).searchParams.get("id")

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
		const id = webviewId()
		return page.evaluate(
			({ id, tolerance }) => {
				const boxes = (selector: string) =>
					[...document.querySelectorAll(selector)].map((element) => ({
						element,
						rect: element.getBoundingClientRect(),
					}))
				const webview = boxes("iframe").find(({ element }) => (element.getAttribute("src") ?? "").includes(`id=${id}`))
				if (!webview) {
					return null
				}
				let best: { x: number; y: number; distance: number; growsRight: boolean } | null = null
				for (const { element, rect } of boxes(".monaco-sash")) {
					// Horizontal sashes belong to the panel/editor, and a `disabled` one marks a
					// boundary that cannot be dragged at all.
					if (rect.height <= rect.width || element.classList.contains("disabled")) {
						continue
					}
					const x = rect.left + rect.width / 2
					const toLeft = Math.abs(x - webview.rect.left)
					const toRight = Math.abs(x - webview.rect.right)
					const distance = Math.min(toLeft, toRight)
					if (distance > tolerance || (best && distance >= best.distance)) {
						continue
					}
					best = { x, y: rect.top + rect.height / 2, distance, growsRight: toRight < toLeft }
				}
				return best
			},
			{ id, tolerance: SASH_EDGE_TOLERANCE_PX },
		)
	}

	return {
		measure,
		async widenTo(targetWidth = PANE_WIDE_WIDTH_PX) {
			let width = await measure()
			if (width >= targetWidth) {
				return width
			}
			await ensureWindowRoom()
			for (let attempt = 0; attempt < 3 && width < targetWidth; attempt++) {
				const sash = await findSash()
				expect(sash, `no draggable sash at the edge of the chat pane (webview id ${webviewId()})`).not.toBeNull()
				const handle = sash as { x: number; y: number; growsRight: boolean }
				const delta = (targetWidth - width) * (handle.growsRight ? 1 : -1)
				await page.mouse.move(handle.x, handle.y)
				await page.mouse.down()
				await page.mouse.move(handle.x + delta, handle.y, { steps: 15 })
				await page.mouse.up()

				const next = await measure()
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
	}
}
