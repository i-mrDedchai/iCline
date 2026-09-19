import posthog from "posthog-js"
import { useEffect, useState } from "react"
import { useExtensionState } from "../context/ExtensionStateContext"

/**
 * Hook to check feature flag status in the webview.
 *
 * Feature flags work independently of telemetry settings to ensure extension
 * functionality can be gated even when telemetry is disabled. In self-hosted
 * mode, PostHog is not initialized, so feature flags are treated as disabled.
 */
/**
 * iCline defaults for flags that gate features iCline ships and hardens
 * itself (the backend payload still wins whenever PostHog answers).
 */
const ICLINE_FLAG_DEFAULTS: Record<string, boolean> = {
	"ext-cline-pass": true,
}

export const useHasFeatureFlag = (flagName: string): boolean => {
	const { environment } = useExtensionState()
	const isSelfHostedOrUnknown = !environment || environment === "selfHosted"
	const [flagEnabled, setFlagEnabled] = useState(ICLINE_FLAG_DEFAULTS[flagName] === true)

	useEffect(() => {
		if (isSelfHostedOrUnknown) {
			setFlagEnabled(ICLINE_FLAG_DEFAULTS[flagName] === true)
			return
		}

		const readFlag = () => {
			const enabled = posthog.isFeatureEnabled(flagName)
			// Undecided (PostHog not initialized / flag absent) falls back to the
			// iCline default; an explicit backend decision always wins.
			setFlagEnabled(enabled ?? ICLINE_FLAG_DEFAULTS[flagName] === true)
		}

		readFlag()
		return posthog.onFeatureFlags(readFlag)
	}, [flagName, isSelfHostedOrUnknown])

	if (isSelfHostedOrUnknown) {
		return ICLINE_FLAG_DEFAULTS[flagName] === true
	}

	return flagEnabled
}
