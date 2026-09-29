import type { ModelInfo } from "@shared/api"
import type { Mode } from "@shared/storage/types"
import { VSCodeLink, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import Fuse from "fuse.js"
import type React from "react"
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { useMount } from "react-use"
import styled from "styled-components"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { splitOnPlaceholder } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import { resolveModelThinkingOptions } from "@/utils/modelThinkingOptions"
import { highlight } from "../history/HistoryView"
import { ModelInfoView } from "./common/ModelInfoView"
import ReasoningEffortSelector from "./ReasoningEffortSelector"
import ThinkingBudgetSlider from "./ThinkingBudgetSlider"
import { getModeSpecificFields } from "./utils/providerUtils"
import { useApiConfigurationHandlers } from "./utils/useApiConfigurationHandlers"

export interface ZenmuxModelPickerProps {
	isPopup?: boolean
	currentMode: Mode
}

/**
 * The provider-pin syntax the routing note tells the user to type. Identifiers, not
 * copy: they stay byte-identical in every language, so they are constants.
 */
const PROVIDER_PIN_SLUG = "model:provider-slug"
const PROVIDER_PIN_EXAMPLE = "anthropic/claude-sonnet-4.5:anthropic"

const ZenmuxModelPicker: React.FC<ZenmuxModelPickerProps> = ({ isPopup, currentMode }) => {
	const { handleModeFieldsChange } = useApiConfigurationHandlers()
	const { apiConfiguration, zenmuxModels, refreshZenmuxModels } = useExtensionState()
	const tr = useTranslation("providers")
	const [routingNoteBeforeSlug, routingNoteAfterSlug] = splitOnPlaceholder(tr("zenmuxRoutingNote"), "slug")
	const [routingNoteBetween, routingNoteAfterExample] = splitOnPlaceholder(routingNoteAfterSlug, "example")
	const modeFields = getModeSpecificFields(apiConfiguration, currentMode)
	const [searchTerm, setSearchTerm] = useState(modeFields.zenmuxModelId || "")
	const [isDropdownVisible, setIsDropdownVisible] = useState(false)
	const [selectedIndex, setSelectedIndex] = useState(-1)
	const dropdownRef = useRef<HTMLDivElement>(null)
	const itemRefs = useRef<(HTMLDivElement | null)[]>([])
	const dropdownListRef = useRef<HTMLDivElement>(null)

	const handleModelChange = (newModelId: string) => {
		setSearchTerm(newModelId)
		handleModeFieldsChange(
			{
				zenmuxModelId: { plan: "planModeZenmuxModelId", act: "actModeZenmuxModelId" },
				zenmuxModelInfo: { plan: "planModeZenmuxModelInfo", act: "actModeZenmuxModelInfo" },
			},
			{
				zenmuxModelId: newModelId,
				zenmuxModelInfo: zenmuxModels[newModelId],
			},
			currentMode,
		)
	}

	const { selectedModelId, selectedModelInfo } = useMemo(() => {
		return {
			selectedModelId: modeFields.zenmuxModelId || "",
			selectedModelInfo: modeFields.zenmuxModelInfo as ModelInfo | undefined,
		}
	}, [modeFields.zenmuxModelId, modeFields.zenmuxModelInfo])
	const thinkingOptions = resolveModelThinkingOptions({
		providerId: "zenmux",
		modelId: selectedModelId,
		modelInfo: selectedModelInfo,
	})

	useMount(refreshZenmuxModels)

	useEffect(() => {
		setSearchTerm(modeFields.zenmuxModelId || "")
	}, [modeFields.zenmuxModelId])

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsDropdownVisible(false)
			}
		}
		document.addEventListener("mousedown", handleClickOutside)
		return () => document.removeEventListener("mousedown", handleClickOutside)
	}, [])

	const modelIds = useMemo(() => Object.keys(zenmuxModels).sort((a, b) => a.localeCompare(b)), [zenmuxModels])

	const searchableItems = useMemo(
		() =>
			modelIds.map((id) => ({
				id,
				html: zenmuxModels[id]?.name ? `${id} — ${zenmuxModels[id].name}` : id,
			})),
		[modelIds, zenmuxModels],
	)

	const fuse = useMemo(
		() =>
			new Fuse(searchableItems, {
				keys: ["id", "html"],
				threshold: 0.4,
				shouldSort: true,
				isCaseSensitive: false,
				includeMatches: true,
				minMatchCharLength: 1,
			}),
		[searchableItems],
	)

	const modelSearchResults = useMemo(() => {
		return searchTerm ? highlight(fuse.search(searchTerm), "model-item-highlight") : searchableItems
	}, [searchableItems, searchTerm, fuse])

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (!isDropdownVisible && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
			setIsDropdownVisible(true)
			return
		}
		if (event.key === "ArrowDown") {
			event.preventDefault()
			setSelectedIndex((prev) => Math.min(prev + 1, modelSearchResults.length - 1))
		} else if (event.key === "ArrowUp") {
			event.preventDefault()
			setSelectedIndex((prev) => Math.max(prev - 1, 0))
		} else if (event.key === "Enter" && selectedIndex >= 0) {
			event.preventDefault()
			handleModelChange(modelSearchResults[selectedIndex].id)
			setIsDropdownVisible(false)
		} else if (event.key === "Escape") {
			setIsDropdownVisible(false)
		}
	}

	useEffect(() => {
		if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
			itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" })
		}
	}, [selectedIndex])

	return (
		<div>
			<label>
				<span style={{ fontWeight: 500 }}>{tr("modelLabel")}</span>
			</label>
			<ModelPickerContainer ref={dropdownRef}>
				<VSCodeTextField
					onFocus={() => setIsDropdownVisible(true)}
					onInput={(e: any) => {
						setSearchTerm(e.target.value)
						setIsDropdownVisible(true)
						setSelectedIndex(-1)
					}}
					onKeyDown={handleKeyDown}
					placeholder={tr("zenmuxModelSearchPlaceholder")}
					style={{ width: "100%", marginTop: 3 }}
					value={searchTerm}
				/>
				{isDropdownVisible && (
					<DropdownList ref={dropdownListRef}>
						{modelSearchResults.length === 0 ? (
							<DropdownItem $isSelected={false}>
								{Object.keys(zenmuxModels).length === 0 ? "Loading models..." : "No models found"}
							</DropdownItem>
						) : (
							modelSearchResults.slice(0, 100).map((item, index) => (
								<DropdownItem
									$isSelected={index === selectedIndex}
									key={item.id}
									onMouseDown={() => {
										handleModelChange(item.id)
										setIsDropdownVisible(false)
									}}
									ref={(el) => {
										itemRefs.current[index] = el
									}}>
									<span dangerouslySetInnerHTML={{ __html: item.html }} />
								</DropdownItem>
							))
						)}
					</DropdownList>
				)}
			</ModelPickerContainer>

			<p style={{ fontSize: "12px", marginTop: 5, color: "var(--vscode-descriptionForeground)" }}>
				{routingNoteBeforeSlug}
				<code>{PROVIDER_PIN_SLUG}</code>
				{routingNoteBetween}
				<code>{PROVIDER_PIN_EXAMPLE}</code>
				{routingNoteAfterExample}{" "}
				<VSCodeLink href="https://docs.zenmux.ai/guide/advanced/provider-routing">
					{tr("zenmuxRoutingDocsLink")}
				</VSCodeLink>
			</p>

			{selectedModelInfo && (
				<>
					{thinkingOptions.showEffort && (
						<ReasoningEffortSelector
							currentMode={currentMode}
							modelId={selectedModelId}
							modelInfo={selectedModelInfo}
							providerId="zenmux"
						/>
					)}
					{thinkingOptions.showThinkingBudget && <ThinkingBudgetSlider currentMode={currentMode} />}
					<ModelInfoView isPopup={isPopup} modelInfo={selectedModelInfo} selectedModelId={selectedModelId} />
				</>
			)}
		</div>
	)
}

const ModelPickerContainer = styled.div`
	position: relative;
	width: 100%;
`

const DropdownList = styled.div`
	position: absolute;
	top: 100%;
	left: 0;
	right: 0;
	max-height: 200px;
	overflow-y: auto;
	background: var(--vscode-dropdown-background);
	border: 1px solid var(--vscode-dropdown-border);
	z-index: 1000;
`

const DropdownItem = styled.div<{ $isSelected?: boolean }>`
	padding: 6px 10px;
	cursor: pointer;
	background: ${(props) => (props.$isSelected ? "var(--vscode-list-activeSelectionBackground)" : "transparent")};
	color: ${(props) => (props.$isSelected ? "var(--vscode-list-activeSelectionForeground)" : "inherit")};
	&:hover {
		background: var(--vscode-list-hoverBackground);
	}
`

export default ZenmuxModelPicker
