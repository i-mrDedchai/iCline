import { EmptyRequest } from "@shared/proto/cline/common"
import ClineLogoSanta from "@/assets/ClineLogoSanta"
import ClineLogoVariable from "@/assets/ClineLogoVariable"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { UiServiceClient } from "@/services/grpc-client"
import IclineWelcomeBrand from "@/components/welcome/icline/IclineWelcomeBrand"
import ProviderModelChip from "@/components/welcome/icline/ProviderModelChip"
import type { QuickStartMode } from "@/components/welcome/icline/quickStartMode"

interface HomeHeaderProps {
	shouldShowQuickWins?: boolean
	quickStartMode?: QuickStartMode
}

const HomeHeader = ({ shouldShowQuickWins = false, quickStartMode }: HomeHeaderProps) => {
	const { environment, mode } = useExtensionState()

	const handleTakeATour = async () => {
		try {
			await UiServiceClient.openWalkthrough(EmptyRequest.create())
		} catch (error) {
			console.error("Error opening walkthrough:", error)
		}
	}

	// iCline: our branded welcome header (compact logo + provider/model chip).
	// Kept as an early branch on top of upstream's HomeHeader so future
	// upstream merges only need to preserve this block.
	if (quickStartMode === "icline") {
		return (
			<div className="flex flex-col items-center mb-5">
				<IclineWelcomeBrand heading="What can we build today?" subheading="Autonomous coding agent · in your IDE" />
				<ProviderModelChip mode={mode} />
			</div>
		)
	}

	const isDecember = new Date().getMonth() === 11 // 11 = December (0-indexed)
	const LogoComponent = isDecember ? ClineLogoSanta : ClineLogoVariable
	const headingText = "What can I do for you?"

	return (
		<div className="flex flex-col items-center mb-5">
			<div className="my-7">
				<LogoComponent className="size-20" environment={environment} />
			</div>
			<div className="text-center flex items-center justify-center px-4">
				<h1 className="m-0 font-bold">{headingText}</h1>
			</div>
			{shouldShowQuickWins && (
				<div className="mt-4">
					<button
						className="flex items-center gap-2 px-4 py-2 rounded-full border border-border-panel bg-white/2 hover:bg-list-background-hover transition-colors duration-150 ease-in-out text-code-foreground text-sm font-medium cursor-pointer"
						onClick={handleTakeATour}
						type="button">
						Take a Tour
						<span className="codicon codicon-play scale-90" />
					</button>
				</div>
			)}
		</div>
	)
}

export default HomeHeader
