import { useMemo } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { resolveTranslatedLocaleFromEnvironment } from "./locales"
import { createTranslator, type Namespace, type Translator } from "./strings"

/**
 * Copy for a namespace, bound to General Settings → Preferred Language and falling
 * back to the language VS Code runs in (see `resolveTranslatedLocale`).
 *
 * This only chooses the language of the *UI*. The same setting also tells the model
 * which language to answer in, and that happens in the host — the two must not be
 * conflated, or changing the interface language would change how the agent talks.
 */
export function useTranslation<N extends Namespace>(namespace: N): Translator<N> {
	const { preferredLanguage } = useExtensionState()
	return useMemo(
		() => createTranslator(resolveTranslatedLocaleFromEnvironment(preferredLanguage), namespace),
		[preferredLanguage, namespace],
	)
}
