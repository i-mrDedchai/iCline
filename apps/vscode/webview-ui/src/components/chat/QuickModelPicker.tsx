/**
 * QuickModelPicker — iCline inline provider+model popover for the chat header.
 *
 * Built on the v4.0.0 SDK hooks (useProviderListings + useProviderModels +
 * ModelsServiceClient.commitModelSelection) so it supports every provider
 * in the SDK catalog — including Sakana, Jan, and ZenMux — without the
 * deleted providers.json file that the legacy ChatModelPicker depended on.
 *
 * UX (preserved from dev.4 ChatModelPicker):
 *  - Click model button → popover opens with provider list (left) + model
 *    list (right) for the current provider.
 *  - Click a provider → its models expand inline.
 *  - Click a model → commitModelSelection RPC switches provider+model
 *    atomically and closes the popover.
 *  - "Edit in Settings…" link opens the upstream ClineModelPicker.
 */

import { CommitModelSelectionRequest } from "@shared/proto/cline/models"
import { Check, ChevronDown, Pencil, RefreshCw, Search } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useProviderListings } from "@/hooks/useProviderListings"
import { useProviderModels } from "@/hooks/useProviderModels"
import { ModelsServiceClient } from "@/services/grpc-client"
import { cn } from "@/lib/utils"

interface QuickModelPickerProps {
	/** Display string shown in the chat header button. */
	modelDisplayName: string
	/** Whether the picker should be disabled (e.g. task running). */
	disabled?: boolean
}

interface ProviderModelsState {
	providerId: string
	models: Record<string, { name?: string }>
	isLoading: boolean
}

/**
 * Fetch and cache models for a provider on first expansion. We use the SDK
 * `useProviderModels` hook per-provider; to keep render count bounded we
 * only instantiate it for the expanded provider rather than the full list.
 */
function useProviderModelsCache(providerId: string | null) {
	// useProviderModels must be called unconditionally — so we pass a stable
	// placeholder when nothing is expanded. The SDK hook tolerates unknown
	// provider ids (returns empty models).
	const { models, defaultModelId, isLoading, refresh } = useProviderModels(providerId ?? "__none__")
	return { models, defaultModelId, isLoading, refresh }
}

export function QuickModelPicker({ modelDisplayName, disabled }: QuickModelPickerProps) {
	const { providers, isLoading: providersLoading } = useProviderListings()
	const { mode } = useExtensionState()
	const [open, setOpen] = useState(false)
	const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
	const [search, setSearch] = useState("")

	// Determine the currently selected provider from apiConfiguration
	const { apiConfiguration } = useExtensionState()
	const currentProvider =
		(mode === "plan" ? apiConfiguration?.planModeApiProvider : apiConfiguration?.actModeApiProvider) || "anthropic"

	// Expand the current provider by default when the popover opens
	useEffect(() => {
		if (open && !expandedProvider) {
			setExpandedProvider(currentProvider)
		}
		if (!open) {
			setSearch("")
		}
	}, [open, expandedProvider, currentProvider])

	const { models, defaultModelId, isLoading: modelsLoading, refresh } = useProviderModelsCache(expandedProvider)

	const handleSelectModel = useCallback(
		async (providerId: string, modelId: string) => {
			try {
				await ModelsServiceClient.commitModelSelection(
					CommitModelSelectionRequest.create({
						providerId,
						mode,
						modelId,
					}),
				)
				setOpen(false)
			} catch (err) {
				console.error("QuickModelPicker: failed to commit model selection:", err)
			}
		},
		[mode],
	)

	const handleRefreshModels = useCallback(() => {
		if (expandedProvider) {
			void refresh()
		}
	}, [expandedProvider, refresh])

	const filteredProviders = useMemo(() => {
		if (!search.trim()) return providers
		const q = search.toLowerCase()
		return providers.filter((p) => p.name?.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
	}, [providers, search])

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					disabled={disabled}
					title="Switch model"
					className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-sm text-(--vscode-descriptionForeground) hover:bg-(--vscode-list-hoverBackground) hover:text-(--vscode-foreground) disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
					<span className="truncate max-w-[180px]">{modelDisplayName}</span>
					<ChevronDown size={12} className="shrink-0" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				side="top"
				className="w-[440px] max-w-[90vw] p-0 gap-0"
				onOpenAutoFocus={(e) => e.preventDefault()}>
				<div className="flex flex-col max-h-[420px]">
					{/* Search bar */}
					<div className="flex items-center gap-2 px-3 py-2 border-b border-(--vscode-editorGroup-border)">
						<Search size={13} className="text-(--vscode-descriptionForeground) shrink-0" />
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search providers…"
							className="flex-1 bg-transparent border-none outline-none text-xs text-(--vscode-foreground) placeholder:text-(--vscode-descriptionForeground)"
							autoFocus
						/>
					</div>

					{/* Provider + model list */}
					<div className="flex-1 overflow-y-auto min-h-0">
						{providersLoading ? (
							<div className="px-3 py-4 text-xs text-(--vscode-descriptionForeground) text-center">
								Loading providers…
							</div>
						) : filteredProviders.length === 0 ? (
							<div className="px-3 py-4 text-xs text-(--vscode-descriptionForeground) text-center">
								No providers found.
							</div>
						) : (
							filteredProviders.map((provider) => {
								const isExpanded = expandedProvider === provider.id
								const isCurrent = currentProvider === provider.id
								return (
									<div key={provider.id} className="border-b border-(--vscode-editorGroup-border)/40 last:border-b-0">
										{/* Provider header */}
										<button
											type="button"
											onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
											className={cn(
												"w-full flex items-center justify-between px-3 py-1.5 text-xs text-left",
												"hover:bg-(--vscode-list-hoverBackground) transition-colors",
												isCurrent && "font-semibold text-(--vscode-foreground)",
												!isCurrent && "text-(--vscode-foreground)",
											)}>
											<span className="truncate flex-1">{provider.name || provider.id}</span>
											{isCurrent && <Check size={13} className="text-(--vscode-terminal-ansiGreen) shrink-0 ml-2" />}
											<ChevronDown
												size={13}
												className={cn(
													"text-(--vscode-descriptionForeground) shrink-0 ml-1 transition-transform",
													isExpanded && "rotate-180",
												)}
											/>
										</button>
										{/* Model list for expanded provider */}
										{isExpanded && (
											<div className="pb-1">
												{modelsLoading ? (
													<div className="px-3 py-1.5 text-[11px] text-(--vscode-descriptionForeground)">
														Loading models…
													</div>
												) : Object.keys(models).length === 0 ? (
													<div className="px-3 py-1.5 text-[11px] text-(--vscode-descriptionForeground) italic">
														No models available.
													</div>
												) : (
													Object.entries(models).map(([modelId, modelInfo]) => {
														const isCurrentModel =
															isCurrent &&
															(mode === "plan"
																? apiConfiguration?.planModeApiModelId === modelId
																: apiConfiguration?.actModeApiModelId === modelId)
														return (
															<button
																type="button"
																key={modelId}
																onClick={() => void handleSelectModel(provider.id, modelId)}
																className={cn(
																	"w-full flex items-center justify-between pl-7 pr-3 py-1 text-[11px] text-left",
																	"hover:bg-(--vscode-list-hoverBackground) transition-colors",
																	isCurrentModel
																		? "text-(--vscode-foreground) font-medium"
																		: "text-(--vscode-descriptionForeground)",
																)}>
																<span className="truncate flex-1">{modelInfo?.name || modelId}</span>
																{isCurrentModel && (
																	<Check size={12} className="text-(--vscode-terminal-ansiGreen) shrink-0 ml-2" />
																)}
															</button>
														)
													})
												)}
											</div>
										)}
									</div>
								)
							})
						)}
					</div>

					{/* Footer */}
					<div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-t border-(--vscode-editorGroup-border) bg-(--vscode-editor-background) text-[11px]">
						<div className="flex items-center gap-3">
							<button
								type="button"
								disabled={!expandedProvider || modelsLoading}
								onClick={handleRefreshModels}
								className="flex items-center gap-1 text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
								<RefreshCw size={11} className={modelsLoading ? "animate-spin" : ""} />
								Refresh
							</button>
							<button
								type="button"
								onClick={() => {
									setOpen(false)
									window.dispatchEvent(new CustomEvent("icline:navigate-to-settings-model-picker"))
								}}
								className="flex items-center gap-1 text-(--vscode-descriptionForeground) hover:text-(--vscode-foreground) transition-colors">
								<Pencil size={11} />
								Edit in Settings…
							</button>
						</div>
						<span className="text-(--vscode-descriptionForeground) truncate">
							Active · {modelDisplayName}
						</span>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	)
}
