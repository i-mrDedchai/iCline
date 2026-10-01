import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useEffect, useRef, useState } from "react"
import { useClickAway } from "react-use"
import {
	APPEARANCE_CHOICES,
	APPEARANCE_ICONS,
	type AppearanceAccentId,
	type AppearanceToken,
	DEFAULT_COMPLETED_ICON,
	DEFAULT_REPLY_ICON,
	resolveAppearanceAccent,
	resolveAppearanceFill,
} from "@/appearance/appearance"
import { useExtensionState } from "@/context/ExtensionStateContext"
import type { AppearanceStringKey } from "@/i18n/namespaces/appearance"
import { useTranslation } from "@/i18n/useTranslation"
import Section from "../Section"
import { updateSetting } from "../utils/settingsHandlers"

interface AppearanceSectionProps {
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

type OpacityKey = "appearanceCompletedOpacity" | "appearanceReplyOpacity" | "appearanceBrandOpacity"
type IconKey = "appearanceCompletedIcon" | "appearanceReplyIcon"

interface AccentRow {
	token: AppearanceToken
	settingKey: "appearanceCompletedAccent" | "appearanceReplyAccent" | "appearanceBrandAccent"
	labelKey: AppearanceStringKey
	hintKey: AppearanceStringKey
	current: string | undefined
	opacityKey: OpacityKey
	opacity: number | undefined
	iconKey?: IconKey
	icon?: string | undefined
	defaultIcon?: string
	paletteTitleKey?: AppearanceStringKey
	previewTitleKey?: AppearanceStringKey
	saturatedNote?: boolean
}

const CHOICE_LABEL_KEYS: Record<AppearanceAccentId, AppearanceStringKey> = {
	theme: "choiceTheme",
	green: "choiceGreen",
	blue: "choiceBlue",
	cyan: "choiceCyan",
	teal: "choiceTeal",
	purple: "choicePurple",
	yellow: "choiceYellow",
	orange: "choiceOrange",
}

/**
 * A miniature of the real surface in the currently selected accent, using the
 * same resolver the chat UI reads (`resolveAppearanceFill`): the preview can
 * never drift from what the slider produces. Body copy is plain bars so the
 * preview needs no extra strings beyond its title — every visible word comes
 * from the `appearance` namespace.
 */
const AccentPreview = ({
	token,
	accent,
	opacity,
	icon,
	titleKey,
}: {
	token: AppearanceToken
	accent: string
	opacity: number | undefined
	icon?: string | undefined
	titleKey?: AppearanceStringKey
}) => {
	const tr = useTranslation("appearance")
	const bar = (width: string): React.CSSProperties => ({
		height: 6,
		borderRadius: 3,
		background: resolveAppearanceFill(accent, 0.25, opacity),
		width,
	})
	const renderIcon = (size: number) => {
		if (!icon || icon === "none") {
			return null
		}
		// The legacy "check" has no emoji glyph — the dot-style tick reads the
		// same at preview size and keeps the accent color like the lucide icon.
		return (
			<span aria-hidden style={{ color: accent, fontSize: size, fontWeight: 700, lineHeight: 1 }}>
				{icon === "check" ? "✓" : icon}
			</span>
		)
	}
	if (token === "cline") {
		return (
			<div aria-label={tr("previewAria")} className="flex flex-col items-start gap-1.5" role="img">
				<span
					style={{
						background: resolveAppearanceFill(accent, 1, opacity),
						border: `1px solid ${resolveAppearanceFill(accent, 1, opacity)}`,
						color: "#fff",
						fontSize: 10,
						fontWeight: 600,
						borderRadius: 4,
						padding: "2px 8px",
					}}>
					{tr("previewBrandName")}
				</span>
				<span
					style={{
						border: `1px solid ${resolveAppearanceFill(accent, 1, opacity)}`,
						color: accent,
						fontSize: 10,
						fontWeight: 600,
						borderRadius: 4,
						padding: "2px 8px",
					}}>
					{tr("previewBrandName")}
				</span>
			</div>
		)
	}
	const borderStrength = token === "reply" ? 0.3 : 0.2
	return (
		<div
			aria-label={tr("previewAria")}
			role="img"
			style={{
				borderRadius: token === "reply" ? 10 : 4,
				border: `1px solid ${resolveAppearanceFill(accent, borderStrength, opacity)}`,
				background: resolveAppearanceFill(accent, 0.1, opacity),
				padding: "6px 8px",
			}}>
			<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
				{renderIcon(10)}
				<span
					style={{
						color: accent,
						fontSize: token === "reply" ? 10 : 11,
						fontWeight: token === "reply" ? 600 : 700,
						letterSpacing: token === "reply" ? "0.4px" : undefined,
					}}>
					{titleKey ? tr(titleKey) : ""}
				</span>
			</div>
			<div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
				<div style={bar("90%")} />
				<div style={bar("60%")} />
			</div>
		</div>
	)
}

/**
 * The floating icon picker. Opens under the row's "Change icon" button and
 * closes on outside click or Escape — the same pattern as the auto-approve
 * modal. Hovering an option shows its translated name above the grid so the
 * choice can be talked about, not just pointed at.
 */
const IconPalette = ({
	titleKey,
	current,
	defaultIcon,
	onPick,
	onClose,
}: {
	titleKey: AppearanceStringKey
	current: string | undefined
	defaultIcon: string
	onPick: (icon: string) => void
	onClose: () => void
}) => {
	const tr = useTranslation("appearance")
	const ref = useRef<HTMLDivElement>(null)
	const [hoverName, setHoverName] = useState<string | null>(null)
	useClickAway(ref, (event) => {
		// The toggle button lives outside the palette — its own click flips
		// visibility, so a click-away firing on the same press would reopen it.
		event.stopPropagation()
		onClose()
	})
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose()
			}
		}
		window.addEventListener("keydown", onKey)
		return () => window.removeEventListener("keydown", onKey)
	}, [onClose])
	return (
		<div
			aria-label={tr(titleKey)}
			className="absolute right-0 top-full mt-1 z-50 rounded-md border border-[var(--vscode-panel-border)] bg-[var(--vscode-menu-background)] p-3 shadow-lg"
			ref={ref}
			role="dialog"
			style={{ width: "min(264px, 70vw)" }}>
			<div className="text-sm mb-1">{tr(titleKey)}</div>
			<div className="text-xs mb-2 text-description" style={{ minHeight: 18 }}>
				{hoverName ?? " "}
			</div>
			<div className="grid grid-cols-6 gap-1.5">
				{APPEARANCE_ICONS.map((option) => {
					const name = tr(option.nameKey)
					const selected = current === option.char
					return (
						<button
							aria-label={name}
							aria-pressed={selected}
							className="flex h-10 items-center justify-center rounded-md border bg-transparent text-xl cursor-pointer"
							key={option.char}
							onClick={() => onPick(option.char)}
							onMouseEnter={() => setHoverName(`${option.char} — ${name}`)}
							style={{
								borderColor: selected ? "var(--vscode-focusBorder)" : "transparent",
								background: selected ? "var(--vscode-list-activeSelectionBackground)" : undefined,
							}}
							title={name}
							type="button">
							{option.char}
						</button>
					)
				})}
			</div>
			<button
				className="mt-2.5 w-full rounded-md border border-[var(--vscode-panel-border)] bg-transparent py-1 text-xs cursor-pointer text-foreground"
				onClick={() => onPick("none")}
				type="button">
				{tr("noIcon")}
			</button>
			<button
				className="mt-1.5 w-full rounded-md border border-[var(--vscode-panel-border)] bg-transparent py-1 text-xs cursor-pointer text-foreground"
				onClick={() => onPick(defaultIcon)}
				type="button">
				{tr("resetIcon")}
			</button>
		</div>
	)
}

/**
 * Settings → Appearance. Three accent rows (Completed box, final-reply card,
 * brand chrome): a swatch radio group over the shared choice catalog, a
 * surface-opacity slider (0–100, 50 = the pre-opacity look), and — for the two
 * titled surfaces — an icon picker. Beside each row sits a live miniature of
 * the real surface that reads the same state the controls write, so picking
 * a swatch, dragging the slider or choosing an icon repaints it instantly.
 * Stored values are choice ids and numbers, never colors.
 */
const AppearanceSection = ({ renderSectionHeader }: AppearanceSectionProps) => {
	const {
		appearanceCompletedAccent,
		appearanceReplyAccent,
		appearanceBrandAccent,
		appearanceCompletedOpacity,
		appearanceReplyOpacity,
		appearanceBrandOpacity,
		appearanceCompletedIcon,
		appearanceReplyIcon,
	} = useExtensionState()
	const tr = useTranslation("appearance")
	const [paletteFor, setPaletteFor] = useState<AppearanceToken | null>(null)

	const rows: AccentRow[] = [
		{
			token: "completed",
			settingKey: "appearanceCompletedAccent",
			labelKey: "completedLabel",
			hintKey: "completedHint",
			current: appearanceCompletedAccent,
			opacityKey: "appearanceCompletedOpacity",
			opacity: appearanceCompletedOpacity,
			iconKey: "appearanceCompletedIcon",
			icon: appearanceCompletedIcon ?? DEFAULT_COMPLETED_ICON,
			defaultIcon: DEFAULT_COMPLETED_ICON,
			paletteTitleKey: "iconPaletteCompleted",
			previewTitleKey: "previewCompletedTitle",
		},
		{
			token: "reply",
			settingKey: "appearanceReplyAccent",
			labelKey: "replyLabel",
			hintKey: "replyHint",
			current: appearanceReplyAccent,
			opacityKey: "appearanceReplyOpacity",
			opacity: appearanceReplyOpacity,
			iconKey: "appearanceReplyIcon",
			icon: appearanceReplyIcon ?? DEFAULT_REPLY_ICON,
			defaultIcon: DEFAULT_REPLY_ICON,
			paletteTitleKey: "iconPaletteReply",
			previewTitleKey: "previewReplyTitle",
		},
		{
			token: "cline",
			settingKey: "appearanceBrandAccent",
			labelKey: "brandLabel",
			hintKey: "brandHint",
			current: appearanceBrandAccent,
			opacityKey: "appearanceBrandOpacity",
			opacity: appearanceBrandOpacity,
			saturatedNote: true,
		},
	]

	const resetAll = () => {
		updateSetting("appearanceCompletedAccent", "theme")
		updateSetting("appearanceReplyAccent", "theme")
		updateSetting("appearanceBrandAccent", "theme")
		updateSetting("appearanceCompletedOpacity", 50)
		updateSetting("appearanceReplyOpacity", 50)
		updateSetting("appearanceBrandOpacity", 50)
		updateSetting("appearanceCompletedIcon", DEFAULT_COMPLETED_ICON)
		updateSetting("appearanceReplyIcon", DEFAULT_REPLY_ICON)
	}

	return (
		<div>
			{renderSectionHeader("appearance")}
			<Section>
				<p className="text-sm text-description mt-1 mb-3">{tr("description")}</p>
				{rows.map((row) => {
					const accent = resolveAppearanceAccent(row.token, row.current)
					return (
						<div className="mb-4" key={row.token}>
							<div className="block mb-1 text-base font-medium">{tr(row.labelKey)}</div>{" "}
							<div className="flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-start">
								<div className="flex-1 min-w-0">
									{" "}
									{/* The row wraps left-aligned when the pane is too narrow for
								all 8 (e2e: real webview is narrower than 8 slots) — wrap is
								fine, spread is not: never space-between, so a wrapped row
								still hugs the left instead of pinning stragglers to the
								edges. The slider below keeps the full 8-slot width as its
								own cap, so its thumb travel never moves with wrapping. */}
									<div
										aria-label={tr(row.labelKey)}
										className="flex items-center gap-2 flex-wrap justify-start"
										role="radiogroup">
										{APPEARANCE_CHOICES.map((choice) => {
											const selected = (row.current ?? "theme") === choice
											return (
												<button
													aria-checked={selected}
													aria-label={tr(CHOICE_LABEL_KEYS[choice])}
													className="flex flex-col items-center gap-1 p-1 rounded-sm cursor-pointer bg-transparent border-0"
													key={choice}
													onClick={() => updateSetting(row.settingKey, choice)}
													role="radio"
													title={tr(CHOICE_LABEL_KEYS[choice])}
													type="button">
													<span
														className="flex items-center justify-center rounded-full"
														style={{
															width: 26,
															height: 26,
															background: resolveAppearanceAccent(row.token, choice),
															outline: selected
																? "2px solid var(--vscode-focusBorder)"
																: "1px solid var(--vscode-panel-border)",
															outlineOffset: 2,
															color: "var(--vscode-button-foreground)",
															fontSize: 14,
															fontWeight: 700,
														}}>
														{selected ? "✓" : ""}
													</span>
													<span className="text-xs text-description">
														{tr(CHOICE_LABEL_KEYS[choice])}
													</span>
												</button>
											)
										})}
									</div>
									{/* Label on its own line: at real webview widths the long
									translated label eats the whole row (e2e: the track got
									~90px of a 217px parent), so the slider gets a full row
									to itself — track + readout share it. */}
									<div className="mt-2" style={{ maxWidth: 408 }}>
										<label className="text-xs text-description" htmlFor={`appearance-opacity-${row.token}`}>
											{tr("opacityLabel")}
										</label>
										<div className="mt-1 flex items-center gap-2">
											<input
												aria-label={tr("opacityLabel")}
												className="flex-1 min-w-0"
												id={`appearance-opacity-${row.token}`}
												max={100}
												min={0}
												onChange={(event) => updateSetting(row.opacityKey, Number(event.target.value))}
												style={{ width: "100%", minWidth: 0 }}
												type="range"
												value={row.opacity ?? 50}
											/>
											<span
												className="text-xs text-description shrink-0"
												style={{ minWidth: 40, textAlign: "right" }}>
												{`${row.opacity ?? 50}%`}
											</span>
										</div>
									</div>
									{row.saturatedNote && (
										<p className="text-xs text-description mt-1">{tr("brandSaturatedNote")}</p>
									)}
									<p className="text-sm text-description mt-1">{tr(row.hintKey)}</p>
								</div>
								<div className="shrink-0 w-full min-[480px]:w-44">
									<AccentPreview
										accent={accent}
										icon={row.icon}
										opacity={row.opacity}
										titleKey={row.previewTitleKey}
										token={row.token}
									/>
									{row.iconKey && row.paletteTitleKey && row.defaultIcon && (
										<div className="relative mt-2">
											<button
												className="rounded-md border border-[var(--vscode-panel-border)] bg-transparent px-2.5 py-1 text-xs cursor-pointer text-foreground"
												onClick={() => setPaletteFor(paletteFor === row.token ? null : row.token)}
												type="button">
												{tr("changeIcon")}
											</button>
											{paletteFor === row.token && (
												<IconPalette
													current={row.icon}
													defaultIcon={row.defaultIcon}
													onClose={() => setPaletteFor(null)}
													onPick={(icon) => {
														updateSetting(row.iconKey as IconKey, icon)
														setPaletteFor(null)
													}}
													titleKey={row.paletteTitleKey}
												/>
											)}
										</div>
									)}
								</div>
							</div>
						</div>
					)
				})}
				<VSCodeButton appearance="secondary" onClick={resetAll}>
					{tr("resetAll")}
				</VSCodeButton>
			</Section>
		</div>
	)
}

export default AppearanceSection
