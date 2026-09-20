import { cn } from "@heroui/react"
import { StringRequest } from "@shared/proto/cline/common"
import React, { memo, useLayoutEffect, useRef, useState } from "react"
import { useWindowSize } from "react-use"
import { FileServiceClient } from "@/services/grpc-client"

/** Edge length of one thumbnail chip when the caller does not ask for another one. */
const DEFAULT_THUMBNAIL_PX = 34

interface ThumbnailsProps {
	images: string[]
	files: string[]
	style?: React.CSSProperties
	setImages?: React.Dispatch<React.SetStateAction<string[]>>
	setFiles?: React.Dispatch<React.SetStateAction<string[]>>
	onHeightChange?: (height: number) => void
	className?: string
	/**
	 * Edge length of one thumbnail, in px. Everything the chip draws (the remove badge,
	 * its offset, the codicon sizes) is derived from it, so a caller can scale the row
	 * without the parts drifting apart. The composer passes a larger value; the
	 * transcript keeps the default.
	 */
	size?: number
}

const Thumbnails = ({
	images,
	files,
	style,
	setImages,
	setFiles,
	onHeightChange,
	className,
	size = DEFAULT_THUMBNAIL_PX,
}: ThumbnailsProps) => {
	const [hoveredIndex, setHoveredIndex] = useState<string | null>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const { width } = useWindowSize()
	// Ratios match the original 34px chip (13px badge at -4px) so the default rendering is
	// unchanged, while a bigger chip gets a bigger, still-proportional badge.
	const badgeSize = Math.round(size * 0.38)
	const badgeOffset = -Math.round(size * 0.12)
	const badgeGlyphSize = Math.round(size * 0.3)
	const fileGlyphSize = Math.round(size * 0.47)
	const fileLabelSize = Math.max(7, Math.round(size * 0.21))

	useLayoutEffect(() => {
		if (containerRef.current) {
			let height = containerRef.current.clientHeight
			// some browsers return 0 for clientHeight
			if (!height) {
				height = containerRef.current.getBoundingClientRect().height
			}
			onHeightChange?.(height)
		}
		setHoveredIndex(null)
	}, [images, files, width, onHeightChange])

	const handleDeleteImages = (index: number) => {
		setImages?.((prevImages) => prevImages.filter((_, i) => i !== index))
	}

	const handleDeleteFiles = (index: number) => {
		setFiles?.((prevFiles) => prevFiles.filter((_, i) => i !== index))
	}

	const isDeletableImages = setImages !== undefined
	const isDeletableFiles = setFiles !== undefined

	const handleImageClick = (image: string) => {
		FileServiceClient.openImage(StringRequest.create({ value: image })).catch((err) =>
			console.error("Failed to open image:", err),
		)
	}

	const handleFileClick = (filePath: string) => {
		FileServiceClient.openFile(StringRequest.create({ value: filePath })).catch((err) =>
			console.error("Failed to open file:", err),
		)
	}

	return (
		<div
			className={cn("flex flex-wrap", className)}
			ref={containerRef}
			style={{
				gap: 5,
				rowGap: 3,
				...style,
			}}>
			{images.map((image, index) => (
				<div
					key={`image-${index}`}
					onMouseEnter={() => setHoveredIndex(`image-${index}`)}
					onMouseLeave={() => setHoveredIndex(null)}
					style={{ position: "relative" }}>
					<img
						alt={`Thumbnail image-${index + 1}`}
						onClick={() => handleImageClick(image)}
						src={image}
						style={{
							width: size,
							height: size,
							objectFit: "cover",
							borderRadius: 4,
							cursor: "pointer",
						}}
					/>
					{isDeletableImages && hoveredIndex === `image-${index}` && (
						<div
							data-icline-thumbnail-remove="image"
							onClick={() => handleDeleteImages(index)}
							style={{
								position: "absolute",
								top: badgeOffset,
								right: badgeOffset,
								width: badgeSize,
								height: badgeSize,
								borderRadius: "50%",
								backgroundColor: "var(--vscode-badge-background)",
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								cursor: "pointer",
							}}>
							<span
								className="codicon codicon-close"
								style={{
									color: "var(--vscode-foreground)",
									fontSize: badgeGlyphSize,
									fontWeight: "bold",
								}}
							/>
						</div>
					)}
				</div>
			))}

			{files.map((filePath, index) => {
				const fileName = filePath.split(/[\\/]/).pop() || filePath

				return (
					<div
						key={`file-${index}`}
						onMouseEnter={() => setHoveredIndex(`file-${index}`)}
						onMouseLeave={() => setHoveredIndex(null)}
						style={{ position: "relative" }}>
						<div
							onClick={() => handleFileClick(filePath)}
							style={{
								width: size,
								height: size,
								borderRadius: 4,
								cursor: "pointer",
								backgroundColor: "var(--vscode-editor-background)",
								border: "1px solid var(--vscode-input-border)",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
							}}>
							<span
								className="codicon codicon-file"
								style={{
									fontSize: fileGlyphSize,
									color: "var(--vscode-foreground)",
								}}
							/>
							<span
								style={{
									fontSize: fileLabelSize,
									marginTop: 1,
									overflow: "hidden",
									textOverflow: "ellipsis",
									maxWidth: "90%",
									whiteSpace: "nowrap",
									textAlign: "center",
								}}
								title={fileName}>
								{fileName}
							</span>
						</div>
						{isDeletableFiles && hoveredIndex === `file-${index}` && (
							<div
								data-icline-thumbnail-remove="file"
								onClick={() => handleDeleteFiles(index)}
								style={{
									position: "absolute",
									top: badgeOffset,
									right: badgeOffset,
									width: badgeSize,
									height: badgeSize,
									borderRadius: "50%",
									backgroundColor: "var(--vscode-badge-background)",
									display: "flex",
									justifyContent: "center",
									alignItems: "center",
									cursor: "pointer",
								}}>
								<span
									className="codicon codicon-close"
									style={{
										color: "var(--vscode-foreground)",
										fontSize: 10,
										fontWeight: "bold",
									}}
								/>
							</div>
						)}
					</div>
				)
			})}
		</div>
	)
}

export default memo(Thumbnails)
