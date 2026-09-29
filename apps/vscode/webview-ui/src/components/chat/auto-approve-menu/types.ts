import { AutoApprovalSettings } from "@shared/AutoApprovalSettings"
import type { QuickStartStringKey } from "@/i18n/namespaces/quickStart"

export interface ActionMetadata {
	id: keyof AutoApprovalSettings["actions"] | "enableNotifications"
	label: string
	/** `quickStart` key for the translated checkbox label (English `label` is the fallback). */
	labelKey?: QuickStartStringKey
	shortName: string
	/** `quickStart` key for the translated collapsed-bar name. */
	shortKey?: QuickStartStringKey
	icon: string
	subAction?: ActionMetadata
	sub?: boolean
	parentActionId?: string
}
