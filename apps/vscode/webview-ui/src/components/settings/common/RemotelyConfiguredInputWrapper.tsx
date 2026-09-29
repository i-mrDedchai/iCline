import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useTranslation } from "@/i18n/useTranslation"

export function RemotelyConfiguredInputWrapper({ hidden, children }: React.PropsWithChildren<{ hidden: boolean }>) {
	// The same sentence the General tab's telemetry switch uses: one string, one table,
	// so the two surfaces cannot drift apart.
	const tr = useTranslation("settings")
	return (
		<Tooltip>
			<TooltipContent hidden={hidden}>{tr("managedByOrganization")}</TooltipContent>
			<TooltipTrigger>{children}</TooltipTrigger>
		</Tooltip>
	)
}

export const LockIcon = () => <i className="codicon codicon-lock text-description text-sm" />
