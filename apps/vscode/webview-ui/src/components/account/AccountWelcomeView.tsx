import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { ClineAuthStatus } from "@/components/account/ClineAuthStatus"
import { useClineSignIn } from "@/context/ClineAuthContext"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { splitOnPlaceholder } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import ClineLogoVariable from "../../assets/ClineLogoVariable"

// export const AccountWelcomeView = () => (
// 	<div className="flex flex-col items-center pr-3 gap-2.5">
// 		<ClineLogoWhite className="size-16 mb-4" />
export const AccountWelcomeView = () => {
	const tr = useTranslation("surfaces")
	const { environment } = useExtensionState()
	const [agreeBeforeTerms, agreeAfterTerms] = splitOnPlaceholder(tr("accountAgreePrefix"), "terms")
	const [agreeBeforePrivacy, agreeAfterPrivacy] = splitOnPlaceholder(agreeAfterTerms, "privacy")
	const { isLoginLoading, authStatusMessage, handleSignIn } = useClineSignIn()

	return (
		<div className="flex flex-col items-center gap-2.5">
			<ClineLogoVariable className="size-16 mb-4" environment={environment} />

			<p>{tr("accountSignupIntro")}</p>

			<VSCodeButton className="w-full mb-4" disabled={isLoginLoading} onClick={handleSignIn}>
				{tr("accountSignup")}
				{isLoginLoading && (
					<span className="ml-1 animate-spin">
						<span className="codicon codicon-refresh" />
					</span>
				)}
			</VSCodeButton>

			<ClineAuthStatus message={authStatusMessage} />

			<p className="text-(--vscode-descriptionForeground) text-xs text-center m-0">
				{agreeBeforeTerms}
				<VSCodeLink href="https://cline.bot/tos">{tr("accountTerms")}</VSCodeLink>
				{agreeBeforePrivacy}
				<VSCodeLink href="https://cline.bot/privacy">{tr("accountPrivacy")}</VSCodeLink>
				{agreeAfterPrivacy}
			</p>
		</div>
	)
}
