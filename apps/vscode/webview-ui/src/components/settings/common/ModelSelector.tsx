import { ModelInfo } from "@shared/api"
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import styled from "styled-components"
import { useTranslation } from "@/i18n/useTranslation"

/**
 * Top of the ladder for dropdowns stacked inside one provider form.
 *
 * Kept below `DROPDOWN_Z_INDEX` (ApiOptions, 1002) so model pickers and their
 * tooltips still win — a form's dropdowns only have to outrank each other.
 */
export const FORM_DROPDOWN_BASE_Z_INDEX = 900

/**
 * Z-index for the Nth dropdown of a stacked form (`0` = the first/topmost control).
 *
 * A dropdown's open list must paint over every control BELOW it, but two positioned
 * siblings with the same z-index are decided by DOM order — the later one wins. One
 * flat value per form therefore covers the earlier control's list with the later
 * control's box (Sakana: the Reasoning Effort select sat on top of the Model list, and
 * Zenmux: Provider routing covered API Protocol). A form has to DESCEND, so the first
 * control takes the top of the ladder and each later one sits below it.
 */
export const formDropdownZIndex = (position: number): number => FORM_DROPDOWN_BASE_Z_INDEX - position

/**
 * Container for dropdowns that ensures proper z-index handling
 * This is necessary to ensure dropdown opens downward
 */
export const DropdownContainer = styled.div.attrs<{ zIndex?: number }>(({ zIndex }) => ({
	style: {
		zIndex: zIndex || 1000,
	},
}))`
	position: relative;

	// Force dropdowns to open downward
	& vscode-dropdown::part(listbox) {
		position: absolute !important;
		top: 100% !important;
		bottom: auto !important;
	}
`

/**
 * Props for the ModelSelector component
 */
interface ModelSelectorProps {
	models: Record<string, ModelInfo>
	selectedModelId: string | undefined
	onChange: (e: any) => void
	zIndex?: number
	label?: string
}

/*
OG Saoud Note:

	VSCodeDropdown has an open bug where dynamically rendered options don't auto select the provided value prop. You can see this for yourself by comparing  it with normal select/option elements, which work as expected.
	https://github.com/microsoft/vscode-webview-ui-toolkit/issues/433

	In our case, when the user switches between providers, we recalculate the selectedModelId depending on the provider, the default model for that provider, and a modelId that the user may have selected. Unfortunately, the VSCodeDropdown component wouldn't select this calculated value, and would default to the first "Select a model..." option instead, which makes it seem like the model was cleared out when it wasn't.

	As a workaround, we create separate instances of the dropdown for each provider, and then conditionally render the one that matches the current provider.
	*/

/**
 * A reusable component for selecting models from a dropdown
 */
export const ModelSelector = ({ models, selectedModelId, onChange, zIndex, label }: ModelSelectorProps) => {
	const tr = useTranslation("providers")
	const modelIds = Object.keys(models)
	// Force VSCodeDropdown to re-initialize after async catalog/selection hydration.
	const dropdownKey = `${selectedModelId ?? ""}:${modelIds.join("\u0000")}`

	return (
		<DropdownContainer className="dropdown-container" zIndex={zIndex}>
			<label htmlFor="model-id">
				<span className="font-medium">{label ?? tr("modelLabel")}</span>
			</label>
			<VSCodeDropdown className="w-full" id="model-id" key={dropdownKey} onChange={onChange} value={selectedModelId}>
				<VSCodeOption value="">{tr("modelSelectPlaceholder")}</VSCodeOption>
				{modelIds.map((modelId) => (
					<VSCodeOption className="break-words whitespace-normal max-w-full" key={modelId} value={modelId}>
						{modelId}
					</VSCodeOption>
				))}
			</VSCodeDropdown>
		</DropdownContainer>
	)
}
