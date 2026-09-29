import { UpdateSettingsRequest } from "@shared/proto/cline/state"
import { memo, type ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useExtensionState } from "@/context/ExtensionStateContext"
import type { StringKey } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import Section from "../Section"
import { updateSetting } from "../utils/settingsHandlers"

/** A key in the `settings` namespace, so a misspelled label is a type error. */
type FeatureStringKey = StringKey<"settings">

// Reusable checkbox component for feature settings
interface FeatureCheckboxProps {
	checked: boolean | undefined
	onChange: (checked: boolean) => void
	label: string
	description: ReactNode
	disabled?: boolean
	isRemoteLocked?: boolean
	remoteTooltip?: string
	isVisible?: boolean
}

/**
 * A feature toggle row. `labelKey`/`descriptionKey` rather than the copy itself: the
 * tables here are module-level, so translated strings cannot be resolved until a
 * component looks up the current locale — and naming the keys makes a toggle added
 * without copy fail to compile.
 */
interface FeatureToggle {
	id: string
	labelKey: FeatureStringKey
	descriptionKey: FeatureStringKey
	settingKey: keyof UpdateSettingsRequest
	stateKey: string
}

const agentFeatures: FeatureToggle[] = [
	{
		id: "auto-compact",
		labelKey: "featureAutoCompactLabel",
		descriptionKey: "featureAutoCompactDescription",
		stateKey: "useAutoCondense",
		settingKey: "useAutoCondense",
	},
	{
		id: "sub-agents",
		labelKey: "featureSubAgentsLabel",
		descriptionKey: "featureSubAgentsDescription",
		stateKey: "subagentsEnabled",
		settingKey: "subagentsEnabled",
	},
	{
		id: "agent-teams",
		labelKey: "featureAgentTeamsLabel",
		descriptionKey: "featureAgentTeamsDescription",
		stateKey: "agentTeamsEnabled",
		settingKey: "agentTeamsEnabled",
	},
]

const editorFeatures: FeatureToggle[] = [
	{
		id: "show-feature-tips",
		labelKey: "featureTipsLabel",
		descriptionKey: "featureTipsDescription",
		stateKey: "showFeatureTips",
		settingKey: "showFeatureTips",
	},
	{
		id: "background-edit",
		labelKey: "featureBackgroundEditLabel",
		descriptionKey: "featureBackgroundEditDescription",
		stateKey: "backgroundEditEnabled",
		settingKey: "backgroundEditEnabled",
	},
	{
		id: "checkpoints",
		labelKey: "featureCheckpointsLabel",
		descriptionKey: "featureCheckpointsDescription",
		stateKey: "enableCheckpointsSetting",
		settingKey: "enableCheckpointsSetting",
	},
	{
		id: "worktrees",
		labelKey: "featureWorktreesLabel",
		descriptionKey: "featureWorktreesDescription",
		stateKey: "worktreesEnabled",
		settingKey: "worktreesEnabled",
	},
]

const experimentalFeatures: FeatureToggle[] = [
	{
		id: "yolo",
		labelKey: "featureYoloLabel",
		descriptionKey: "featureYoloDescription",
		stateKey: "yoloModeToggled",
		settingKey: "yoloModeToggled",
	},
]

const advancedFeatures: FeatureToggle[] = [
	{
		id: "hooks",
		labelKey: "featureHooksLabel",
		descriptionKey: "featureHooksDescription",
		stateKey: "hooksEnabled",
		settingKey: "hooksEnabled",
	},
]

const FeatureRow = memo(
	({
		checked = false,
		onChange,
		label,
		description,
		disabled,
		isRemoteLocked,
		isVisible = true,
		remoteTooltip,
	}: FeatureCheckboxProps) => {
		if (!isVisible) {
			return null
		}

		const checkbox = (
			<div className="flex items-center justify-between w-full">
				<div>{label}</div>
				<div>
					<Switch
						checked={checked}
						className="shrink-0"
						disabled={disabled || isRemoteLocked}
						id={label}
						onCheckedChange={onChange}
						size="lg"
					/>
					{isRemoteLocked && <i className="codicon codicon-lock text-description text-sm" />}
				</div>
			</div>
		)

		return (
			<div className="flex flex-col items-start justify-between gap-4 py-3 w-full">
				<div className="space-y-0.5 flex-1 w-full">
					{isRemoteLocked ? (
						<Tooltip>
							<TooltipTrigger asChild>{checkbox}</TooltipTrigger>
							<TooltipContent className="max-w-xs" side="top">
								{remoteTooltip}
							</TooltipContent>
						</Tooltip>
					) : (
						checkbox
					)}
				</div>
				<div className="text-xs text-description">{description}</div>
			</div>
		)
	},
)

interface FeatureSettingsSectionProps {
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

const FeatureSettingsSection = ({ renderSectionHeader }: FeatureSettingsSectionProps) => {
	const {
		enableCheckpointsSetting,
		hooksEnabled,
		mcpDisplayMode,
		yoloModeToggled,
		useAutoCondense,
		compactionStrategy,
		subagentsEnabled,
		agentTeamsEnabled,
		worktreesEnabled,
		remoteConfigSettings,
		backgroundEditEnabled,
		showFeatureTips,
	} = useExtensionState()
	const tr = useTranslation("settings")

	const isYoloRemoteLocked = remoteConfigSettings?.yoloModeToggled !== undefined

	// State lookup for mapped features
	const featureState: Record<string, boolean | undefined> = {
		showFeatureTips,
		enableCheckpointsSetting,
		hooksEnabled,
		useAutoCondense,
		subagentsEnabled,
		agentTeamsEnabled,
		worktreesEnabled: worktreesEnabled?.user,
		backgroundEditEnabled,
		yoloModeToggled: isYoloRemoteLocked ? remoteConfigSettings?.yoloModeToggled : yoloModeToggled,
	}

	// Visibility lookup for features with feature flags
	const featureVisibility: Record<string, boolean | undefined> = {
		worktreesEnabled: worktreesEnabled?.featureFlag,
	}

	return (
		<div className="mb-2">
			{renderSectionHeader("features")}
			<Section>
				<div className="mb-5 flex flex-col gap-3">
					{/* Core features */}
					<div>
						<div className="text-xs font-medium text-foreground/80 uppercase tracking-wider mb-3">
							{tr("featureGroupAgent")}
						</div>
						<div
							className="relative p-3 pt-0 my-3 rounded-md border border-editor-widget-border/50"
							id="agent-features">
							{agentFeatures.map((feature) => (
								<FeatureRow
									checked={featureState[feature.stateKey]}
									description={tr(feature.descriptionKey)}
									isVisible={featureVisibility[feature.stateKey] ?? true}
									key={feature.id}
									label={tr(feature.labelKey)}
									onChange={(checked) => updateSetting(feature.settingKey, checked)}
								/>
							))}
							<div className="space-y-2 py-3">
								<Label className="text-sm font-medium text-foreground">
									{tr("featureCompactionStrategyLabel")}
								</Label>
								<p className="text-xs text-muted-foreground">{tr("featureCompactionStrategyHint")}</p>
								<Select
									disabled={!useAutoCondense}
									onValueChange={(value) => updateSetting("compactionStrategy", value)}
									value={compactionStrategy ?? "basic"}>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="basic">{tr("featureCompactionStrategyBasic")}</SelectItem>
										<SelectItem value="agentic">{tr("featureCompactionStrategyAgentic")}</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					{/* Editor features */}
					<div>
						<div className="text-xs font-medium text-foreground/80 uppercase tracking-wider mb-3">
							{tr("featureGroupEditor")}
						</div>
						<div
							className="relative p-3 pt-0 my-3 rounded-md border border-editor-widget-border/50"
							id="optional-features">
							{editorFeatures.map((feature) => (
								<FeatureRow
									checked={featureState[feature.stateKey]}
									description={tr(feature.descriptionKey)}
									isVisible={featureVisibility[feature.stateKey] ?? true}
									key={feature.id}
									label={tr(feature.labelKey)}
									onChange={(checked) => updateSetting(feature.settingKey, checked)}
								/>
							))}
						</div>
					</div>

					{/* Experimental features */}
					<div>
						<div className="text-xs font-medium uppercase tracking-wider mb-3 text-warning/80">
							{tr("featureGroupExperimental")}
						</div>
						<div
							className="relative p-3 pt-0 my-3 rounded-md border border-editor-widget-border/50 w-full"
							id="experimental-features">
							{experimentalFeatures.map((feature) => (
								<FeatureRow
									checked={featureState[feature.stateKey]}
									description={tr(feature.descriptionKey)}
									disabled={feature.id === "yolo" && isYoloRemoteLocked}
									isRemoteLocked={feature.id === "yolo" && isYoloRemoteLocked}
									isVisible={featureVisibility[feature.stateKey] ?? true}
									key={feature.id}
									label={tr(feature.labelKey)}
									onChange={(checked) => updateSetting(feature.settingKey, checked)}
									remoteTooltip={tr("managedByOrganization")}
								/>
							))}
						</div>
					</div>
				</div>

				{/* Advanced */}
				<div>
					<div className="text-xs font-medium text-foreground/80 uppercase tracking-wider mb-3">
						{tr("featureGroupAdvanced")}
					</div>
					<div className="relative p-3 my-3 rounded-md border border-editor-widget-border/50" id="advanced-features">
						<div className="space-y-3">
							{advancedFeatures.map((feature) => (
								<FeatureRow
									checked={featureState[feature.stateKey]}
									description={tr(feature.descriptionKey)}
									isVisible={featureVisibility[feature.stateKey] ?? true}
									key={feature.id}
									label={tr(feature.labelKey)}
									onChange={(checked) => updateSetting(feature.settingKey, checked)}
								/>
							))}

							{/* MCP Display Mode */}
							<div className="space-y-2">
								<Label className="text-sm font-medium text-foreground">{tr("featureMcpDisplayModeLabel")}</Label>
								<p className="text-xs text-muted-foreground">{tr("featureMcpDisplayModeHint")}</p>
								<Select onValueChange={(v) => updateSetting("mcpDisplayMode", v)} value={mcpDisplayMode}>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="plain">{tr("featureMcpDisplayModePlain")}</SelectItem>
										<SelectItem value="rich">{tr("featureMcpDisplayModeRich")}</SelectItem>
										<SelectItem value="markdown">{tr("featureMcpDisplayModeMarkdown")}</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
				</div>
			</Section>
		</div>
	)
}
export default memo(FeatureSettingsSection)
