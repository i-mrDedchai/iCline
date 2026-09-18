import React, { useMemo } from "react"
import { useProviderListings } from "@/hooks/useProviderListings"

/**
 * Rounded summary chips for the API Configuration section: how many providers
 * the live SDK catalog serves, how many bundled catalog models they carry in
 * total, and how many of those are featured in the feed's free tier (Cline /
 * ClinePass). Hidden until the listings load so the card never flashes zeros.
 */
export const ProviderStatsCard: React.FC = () => {
	const { providers } = useProviderListings()

	const stats = useMemo(() => {
		let totalModels = 0
		let freeModels = 0
		for (const provider of providers) {
			totalModels += provider.modelCount ?? 0
			freeModels += provider.freeModelCount ?? 0
		}
		return { providerCount: providers.length, totalModels, freeModels }
	}, [providers])

	if (providers.length === 0) {
		return null
	}

	const chipStyle: React.CSSProperties = {
		display: "flex",
		alignItems: "center",
		gap: 7,
		padding: "6px 12px",
		borderRadius: 10,
		background: "var(--vscode-sideBar-background, rgba(128,128,128,0.08))",
		border: "1px solid var(--vscode-panel-border, rgba(128,128,128,0.25))",
	}
	const dotStyle = (background: string): React.CSSProperties => ({
		width: 7,
		height: 7,
		borderRadius: "50%",
		background,
		flexShrink: 0,
	})
	const valueStyle: React.CSSProperties = { fontWeight: 600, fontSize: 12.5 }
	const labelStyle: React.CSSProperties = {
		fontSize: 11,
		color: "var(--vscode-descriptionForeground)",
	}

	return (
		<div data-testid="provider-stats-card" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
			<div style={chipStyle} title="Providers available in the catalog">
				<span style={dotStyle("#5ec8ff")} />
				<span style={valueStyle}>{stats.providerCount.toLocaleString()}</span>
				<span style={labelStyle}>Providers</span>
			</div>
			<div style={chipStyle} title="Total models across all providers' bundled catalogs">
				<span style={dotStyle("#c39bff")} />
				<span style={valueStyle}>{stats.totalModels.toLocaleString()}</span>
				<span style={labelStyle}>Models</span>
			</div>
			{stats.freeModels > 0 && (
				<div style={chipStyle} title="Models featured in the Cline free tier">
					<span style={dotStyle("#56d364")} />
					<span style={valueStyle}>{stats.freeModels.toLocaleString()}</span>
					<span style={labelStyle}>Free</span>
				</div>
			)}
		</div>
	)
}
