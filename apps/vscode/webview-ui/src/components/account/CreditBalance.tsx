import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { formatString } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import VSCodeButtonLink from "../common/VSCodeButtonLink"
import { StyledCreditDisplay } from "./StyledCreditDisplay"

type CreditBalanceProps = {
	balance: number | null
	fetchCreditBalance: () => void
	creditUrl: URL
	lastFetchTime: number
	isLoading: boolean
}

export const CreditBalance = ({ balance, fetchCreditBalance, creditUrl, lastFetchTime, isLoading }: CreditBalanceProps) => {
	const tr = useTranslation("surfaces")
	return (
		<div
			className="w-full flex flex-col items-center"
			title={formatString(tr, "accountLastUpdated", { time: new Date(lastFetchTime).toLocaleTimeString() })}>
			<div className="text-sm text-(--vscode-descriptionForeground) mb-3 font-azeret-mono font-light">
				{tr("accountCurrentBalance")}
			</div>

			<div className="font-bold text-2xl mb-6 flex items-center gap-2">
				{balance === null ? <span>----</span> : <StyledCreditDisplay balance={balance} />}
				<VSCodeButton
					appearance="icon"
					className={`mt-1 ${isLoading ? "animate-spin" : ""}`}
					disabled={isLoading}
					onClick={fetchCreditBalance}
					title={tr("accountRefreshBalance")}>
					<span className="codicon codicon-refresh" />
				</VSCodeButton>
			</div>

			<div className="w-full">
				<VSCodeButtonLink className="w-full" href={creditUrl.href}>
					{tr("accountAddCredits")}
				</VSCodeButtonLink>
			</div>
		</div>
	)
}
