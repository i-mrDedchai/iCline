import type { Mode } from "@shared/storage/types"
import { useEffect, useRef } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { getActiveProviderAndModelId } from "./useNormalizedApiConfiguration"
import { useProviderModels } from "./useProviderModels"

/**
 * Gives the chat surface its own catalog revalidation path.
 *
 * Before this hook, only Settings pickers mounted `useProviderModels`,
 * so the chat header trusted whatever the webview-side warm cache held —
 * potentially a stale declaration from long ago (dev.5-fix.1: 128K stuck
 * in chat while Settings showed 1M, self-healing only as a side effect of
 * opening Settings). Mounting this in `ChatView` means entering chat,
 * switching models, or returning from another surface refreshes the
 * active provider's catalog instead of inheriting someone else's snapshot.
 *
 * Refresh fires on provider/model switches and when the chat becomes
 * visible again — never per render. `useProviderModels` already
 * force-refreshes on mount, so the first effect run only records state.
 */
export function useChatProviderCatalogRefresh(mode: Mode, isVisible: boolean): void {
	const { apiConfiguration } = useExtensionState()
	const { provider, modelId } = getActiveProviderAndModelId(apiConfiguration, mode)
	const { refresh } = useProviderModels(provider)
	const key = `${provider}::${modelId ?? ""}`
	const stateRef = useRef<{ key: string | null; visible: boolean }>({ key: null, visible: isVisible })

	useEffect(() => {
		const prev = stateRef.current
		const becameVisible = isVisible && !prev.visible
		const switched = prev.key !== null && prev.key !== key
		prev.key = key
		prev.visible = isVisible
		if (isVisible && (becameVisible || switched)) {
			void refresh()
		}
	}, [isVisible, key, refresh])
}
