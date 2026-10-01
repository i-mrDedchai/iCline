import type React from "react"
import { useMemo } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { resolveAppearanceAccent, resolveAppearanceFill, TOKEN_CSS_VARS, TOKEN_FILL_VARS } from "./appearance"

/**
 * The accent + tint overrides for the webview root. Applied unconditionally:
 * a `"theme"` choice resolves to the same value the stylesheet declares, so
 * the default path is byte-identical to not overriding at all — one code
 * path, and the resolver test pins it. Opacity 50 reproduces the exact
 * pre-opacity ratios (completed 10/20, reply 10/30, brand solid); copy
 * always reads the raw `--color-*` accent, so text never fades with the tint.
 */
export function useAppearanceVars(): React.CSSProperties {
	const {
		appearanceCompletedAccent,
		appearanceReplyAccent,
		appearanceBrandAccent,
		appearanceCompletedOpacity,
		appearanceReplyOpacity,
		appearanceBrandOpacity,
	} = useExtensionState()
	return useMemo(() => {
		const completed = resolveAppearanceAccent("completed", appearanceCompletedAccent)
		const reply = resolveAppearanceAccent("reply", appearanceReplyAccent)
		const brand = resolveAppearanceAccent("cline", appearanceBrandAccent)
		return {
			[TOKEN_CSS_VARS.completed]: completed,
			[TOKEN_CSS_VARS.reply]: reply,
			[TOKEN_CSS_VARS.cline]: resolveAppearanceFill(brand, 1, appearanceBrandOpacity),
			[TOKEN_FILL_VARS.completed.bg]: resolveAppearanceFill(completed, 0.1, appearanceCompletedOpacity),
			[TOKEN_FILL_VARS.completed.border]: resolveAppearanceFill(completed, 0.2, appearanceCompletedOpacity),
			[TOKEN_FILL_VARS.reply.bg]: resolveAppearanceFill(reply, 0.1, appearanceReplyOpacity),
			[TOKEN_FILL_VARS.reply.border]: resolveAppearanceFill(reply, 0.3, appearanceReplyOpacity),
		} as React.CSSProperties
	}, [
		appearanceCompletedAccent,
		appearanceReplyAccent,
		appearanceBrandAccent,
		appearanceCompletedOpacity,
		appearanceReplyOpacity,
		appearanceBrandOpacity,
	])
}
