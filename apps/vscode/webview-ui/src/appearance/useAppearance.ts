import type React from "react"
import { useMemo } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { resolveAppearanceAccent, TOKEN_CSS_VARS } from "./appearance"

/**
 * The three accent overrides for the webview root. Applied unconditionally:
 * a `"theme"` choice resolves to the same value the stylesheet declares, so
 * the default path is byte-identical to not overriding at all — one code
 * path, and the resolver test pins it.
 */
export function useAppearanceVars(): React.CSSProperties {
	const { appearanceCompletedAccent, appearanceReplyAccent, appearanceBrandAccent } = useExtensionState()
	return useMemo(
		() =>
			({
				[TOKEN_CSS_VARS.completed]: resolveAppearanceAccent("completed", appearanceCompletedAccent),
				[TOKEN_CSS_VARS.reply]: resolveAppearanceAccent("reply", appearanceReplyAccent),
				[TOKEN_CSS_VARS.cline]: resolveAppearanceAccent("cline", appearanceBrandAccent),
			}) as React.CSSProperties,
		[appearanceCompletedAccent, appearanceReplyAccent, appearanceBrandAccent],
	)
}
