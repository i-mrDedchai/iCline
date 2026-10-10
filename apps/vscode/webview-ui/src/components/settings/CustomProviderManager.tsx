import { StringRequest } from "@shared/proto/cline/common"
import { CustomProviderMutationRequest, OpenAiModelsRequest, type ProviderListing } from "@shared/proto/cline/models"
import { Eye, EyeOff } from "lucide-react"
import { type CSSProperties, useCallback, useMemo, useState } from "react"
import { useProviderListings } from "@/hooks/useProviderListings"
import { formatString, splitOnPlaceholder } from "@/i18n/strings"
import { useTranslation } from "@/i18n/useTranslation"
import { ModelsServiceClient } from "@/services/grpc-client"
import { getSavedApiKeyMask, sanitizeMaskedApiKeyInput } from "./utils/apiKeyMasking"

type HeaderRow = { key: string; value: string }

interface FormState {
	providerId: string
	name: string
	baseUrl: string
	apiKey: string
	modelsSourceUrl: string
	modelsText: string
	defaultModelId: string
	headers: HeaderRow[]
}

const EMPTY_FORM: FormState = {
	providerId: "",
	name: "",
	baseUrl: "",
	apiKey: "",
	modelsSourceUrl: "",
	modelsText: "",
	defaultModelId: "",
	headers: [],
}

const INPUT_STYLE: CSSProperties = {
	width: "100%",
	background: "var(--vscode-input-background)",
	color: "var(--vscode-input-foreground)",
	border: "1px solid var(--vscode-input-border, var(--vscode-widget-border, rgba(128, 128, 128, 0.4)))",
	borderRadius: 3,
	padding: "5px 8px",
	fontSize: 12,
	outline: "none",
	boxSizing: "border-box",
}

const SELECT_STYLE: CSSProperties = {
	width: "100%",
	background: "var(--vscode-dropdown-background, var(--vscode-input-background))",
	color: "var(--vscode-dropdown-foreground, var(--vscode-input-foreground))",
	border: "1px solid var(--vscode-dropdown-border, var(--vscode-input-border, var(--vscode-widget-border, rgba(128, 128, 128, 0.4))))",
	borderRadius: 3,
	padding: "5px 8px",
	fontSize: 12,
	outline: "none",
	boxSizing: "border-box",
}

function toFormState(provider: ProviderListing): FormState {
	return {
		...EMPTY_FORM,
		providerId: provider.id,
		name: provider.name,
		defaultModelId: provider.defaultModelId ?? "",
	}
}

function toMutationRequest(form: FormState): CustomProviderMutationRequest {
	const models = form.modelsText
		.split(/[\n,]/)
		.map((id) => id.trim())
		.filter(Boolean)
	const headers: Record<string, string> = {}
	for (const row of form.headers) {
		if (row.key.trim()) {
			headers[row.key.trim()] = row.value
		}
	}
	return CustomProviderMutationRequest.create({
		providerId: form.providerId.trim().toLowerCase(),
		name: form.name.trim(),
		baseUrl: form.baseUrl.trim(),
		apiKey: form.apiKey.trim() || undefined,
		headers,
		models,
		defaultModelId: form.defaultModelId.trim() || undefined,
		modelsSourceUrl: form.modelsSourceUrl.trim() || undefined,
	})
}

/**
 * Settings card for multi custom-provider management (add / edit / delete).
 * Redesigned with compact modern layout, clear VS Code input boundaries,
 * automatic model discovery, and collapsible advanced options.
 */
export const CustomProviderManager = () => {
	const { providers, refresh } = useProviderListings()
	const tr = useTranslation("providers")
	const customProviders = useMemo(() => providers.filter((provider) => provider.isCustom), [providers])

	const [editing, setEditing] = useState<{ mode: "create" | "edit"; form: FormState } | null>(null)
	const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Auto-fetch model state
	const [isFetchingModels, setIsFetchingModels] = useState(false)
	const [fetchModelStatus, setFetchModelStatus] = useState<{ success?: string; error?: string } | null>(null)
	const [showAdvanced, setShowAdvanced] = useState(false)
	// The saved key is write-only: the host sends only its length, shown as a mask.
	const [savedApiKeyMask, setSavedApiKeyMask] = useState("")
	const [showApiKey, setShowApiKey] = useState(false)

	const openCreate = useCallback(() => {
		setError(null)
		setFetchModelStatus(null)
		setConfirmingDeleteId(null)
		setShowAdvanced(false)
		setSavedApiKeyMask("")
		setShowApiKey(false)
		setEditing({ mode: "create", form: { ...EMPTY_FORM } })
	}, [])

	const openEdit = useCallback(async (provider: ProviderListing) => {
		setError(null)
		setFetchModelStatus(null)
		setConfirmingDeleteId(null)
		setShowAdvanced(false)
		setSavedApiKeyMask("")
		setShowApiKey(false)
		setEditing({ mode: "edit", form: toFormState(provider) })
		// The listing does not carry the endpoint, so read the saved base URL
		// from the provider config. The API key stays write-only.
		try {
			const config = await ModelsServiceClient.readProviderConfig(StringRequest.create({ value: provider.id }))
			setSavedApiKeyMask(getSavedApiKeyMask(config.apiKeyLength))
			setEditing((current) =>
				current?.mode === "edit" && current.form.providerId === provider.id
					? { ...current, form: { ...current.form, baseUrl: config.baseUrl ?? "" } }
					: current,
			)
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		}
	}, [])

	const updateForm = useCallback((patch: Partial<FormState>) => {
		setEditing((current) => (current ? { ...current, form: { ...current.form, ...patch } } : current))
	}, [])

	const fetchModelsFromEndpoint = useCallback(async () => {
		if (!editing?.form.baseUrl?.trim()) {
			setFetchModelStatus({ error: tr("customProviderNeedBaseUrl") })
			return
		}

		setIsFetchingModels(true)
		setFetchModelStatus(null)

		try {
			const res = await ModelsServiceClient.refreshOpenAiModels(
				OpenAiModelsRequest.create({
					providerId: editing.form.providerId.trim() || "openai-compatible",
					baseUrl: editing.form.baseUrl.trim(),
					apiKey: editing.form.apiKey.trim() || undefined,
				}),
			)

			const fetched = res.values || []
			if (fetched.length === 0) {
				setFetchModelStatus({ error: tr("customProviderFetchedNone") })
			} else {
				setFetchModelStatus({
					success:
						fetched.length === 1
							? tr("customProviderFetchedOne")
							: formatString(tr, "customProviderFetchedMany", { count: fetched.length }),
				})

				// Merge with existing models without duplicating
				const currentModels = editing.form.modelsText
					.split(/[\n,]/)
					.map((id) => id.trim())
					.filter(Boolean)
				const merged = Array.from(new Set([...currentModels, ...fetched]))
				const defaultModel = editing.form.defaultModelId.trim() || fetched[0] || ""

				updateForm({
					modelsText: merged.join(", "),
					defaultModelId: defaultModel,
				})
			}
		} catch (err) {
			setFetchModelStatus({ error: err instanceof Error ? err.message : String(err) })
		} finally {
			setIsFetchingModels(false)
		}
	}, [
		editing?.form.apiKey,
		editing?.form.baseUrl,
		editing?.form.defaultModelId,
		editing?.form.modelsText,
		editing?.form.providerId,
		updateForm,
	])

	const submit = useCallback(async () => {
		if (!editing) {
			return
		}
		setBusy(true)
		setError(null)
		try {
			const request = toMutationRequest(editing.form)
			if (editing.mode === "create") {
				await ModelsServiceClient.createCustomProvider(request)
			} else {
				await ModelsServiceClient.updateCustomProvider(request)
			}
			await refresh()
			setEditing(null)
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		} finally {
			setBusy(false)
		}
	}, [editing, refresh])

	const remove = useCallback(
		async (providerId: string) => {
			setBusy(true)
			setError(null)
			try {
				await ModelsServiceClient.deleteCustomProvider(StringRequest.create({ value: providerId }))
				await refresh()
				setConfirmingDeleteId(null)
				setEditing((current) => (current?.form.providerId === providerId ? null : current))
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err))
			} finally {
				setBusy(false)
			}
		},
		[refresh],
	)

	// Available model IDs from the current form for the dropdown
	const parsedModelIds = useMemo(() => {
		if (!editing) return []
		return editing.form.modelsText
			.split(/[\n,]/)
			.map((id) => id.trim())
			.filter(Boolean)
	}, [editing])

	return (
		<div className="mb-4" data-testid="custom-provider-manager">
			{/* Section Header */}
			<div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--vscode-widget-border,var(--vscode-panel-border))]">
				<div className="flex items-center gap-2">
					<span className="font-semibold text-xs uppercase tracking-wider text-[var(--vscode-foreground)]">
						{tr("customProvidersTitle")}
					</span>
					{customProviders.length > 0 && (
						<span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)]">
							{customProviders.length}
						</span>
					)}
				</div>
				<button
					className="px-2.5 py-1 text-xs font-medium rounded transition-colors"
					data-testid="custom-provider-add"
					disabled={busy || editing !== null}
					onClick={openCreate}
					style={{
						background: "var(--vscode-button-background)",
						color: "var(--vscode-button-foreground)",
						opacity: busy || editing ? 0.6 : 1,
						cursor: busy || editing ? "default" : "pointer",
					}}>
					{tr("customProviderAdd")}
				</button>
			</div>

			{error && (
				<div
					className="p-2 mb-3 text-xs rounded border border-[var(--vscode-inputValidation-errorBorder,var(--vscode-errorForeground))] bg-[var(--vscode-inputValidation-errorBackground,rgba(255,0,0,0.1))] text-[var(--vscode-errorForeground)]"
					data-testid="custom-provider-error"
					role="alert">
					{error}
				</div>
			)}

			{/* Provider List */}
			{customProviders.length === 0 && !editing && (
				<div className="text-xs text-[var(--vscode-descriptionForeground)] py-2 text-center border border-dashed border-[var(--vscode-widget-border,rgba(128,128,128,0.3))] rounded">
					{(() => {
						const [before, after] = splitOnPlaceholder(tr("customProviderEmptyNotice"), "{action}")
						return (
							<>
								{before}
								{tr("customProviderAdd")}
								{after}
							</>
						)
					})()}
				</div>
			)}

			<div className="flex flex-col gap-1.5 mb-2">
				{customProviders.map((provider) => (
					<div
						className="flex items-center justify-between p-2 rounded border border-[var(--vscode-widget-border,rgba(128,128,128,0.25))] bg-[var(--vscode-editor-background)] hover:border-[var(--vscode-focusBorder,rgba(128,128,128,0.5))] transition-colors"
						data-testid={`custom-provider-row-${provider.id}`}
						key={provider.id}>
						<div className="flex-1 min-w-0 pr-2">
							<div className="flex items-center gap-1.5">
								<span className="font-medium text-xs text-[var(--vscode-foreground)] truncate">
									{provider.name}
								</span>
								<span className="text-[10px] px-1 py-0.2 rounded font-mono bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] shrink-0">
									{tr("customProviderBadge")}
								</span>
							</div>
							<div className="text-[11px] text-[var(--vscode-descriptionForeground)] font-mono truncate mt-0.5">
								ID: {provider.id}
								{provider.defaultModelId
									? ` · ${formatString(tr, "customProviderDefaultSuffix", { model: provider.defaultModelId })}`
									: ""}
							</div>
						</div>

						<div className="flex items-center gap-1 shrink-0">
							<button
								className="px-2 py-0.5 text-xs rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)]"
								data-testid={`custom-provider-edit-${provider.id}`}
								disabled={busy}
								onClick={() => void openEdit(provider)}
								style={{ cursor: busy ? "default" : "pointer" }}>
								{tr("customProviderEdit")}
							</button>

							{confirmingDeleteId === provider.id ? (
								<button
									className="px-2 py-0.5 text-xs rounded border border-red-500/50 bg-red-500/10 text-[var(--vscode-errorForeground)] font-medium"
									data-testid={`custom-provider-delete-confirm-${provider.id}`}
									disabled={busy}
									onClick={() => void remove(provider.id)}
									style={{ cursor: busy ? "default" : "pointer" }}>
									{tr("customProviderConfirmDelete")}
								</button>
							) : (
								<button
									className="px-2 py-0.5 text-xs rounded text-[var(--vscode-errorForeground)] hover:bg-[var(--vscode-inputValidation-errorBackground,rgba(255,0,0,0.1))]"
									data-testid={`custom-provider-delete-${provider.id}`}
									disabled={busy}
									onClick={() => setConfirmingDeleteId(provider.id)}
									style={{ cursor: busy ? "default" : "pointer" }}>
									{tr("customProviderDelete")}
								</button>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Add / Edit Form Modal Card */}
			{editing && (
				<div
					className="p-3 mb-3 rounded-md border border-[var(--vscode-focusBorder,var(--vscode-widget-border))] bg-[var(--vscode-editor-background)] shadow-sm"
					data-testid="custom-provider-form">
					<div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--vscode-widget-border,rgba(128,128,128,0.2))]">
						<span className="font-semibold text-xs text-[var(--vscode-foreground)]">
							{editing.mode === "create"
								? tr("customProviderAddTitle")
								: formatString(tr, "customProviderEditTitle", { id: editing.form.providerId })}
						</span>
						<button
							aria-label={tr("customProviderCloseForm")}
							className="text-xs text-[var(--vscode-descriptionForeground)] hover:text-[var(--vscode-foreground)] p-1"
							disabled={busy}
							onClick={() => setEditing(null)}>
							✕
						</button>
					</div>

					<div className="flex flex-col gap-2.5">
						{/* Provider ID & Name */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
							{editing.mode === "create" ? (
								<div>
									<label
										className="block text-xs font-medium mb-1 text-[var(--vscode-foreground)]"
										htmlFor="cp-id">
										{tr("customProviderIdLabel")}{" "}
										<span className="text-[var(--vscode-errorForeground)]">*</span>
									</label>
									<input
										data-testid="custom-provider-id"
										disabled={busy}
										id="cp-id"
										onChange={(e) => updateForm({ providerId: e.target.value })}
										placeholder={tr("customProviderIdPlaceholder")}
										style={INPUT_STYLE}
										value={editing.form.providerId}
									/>
									<span className="text-[10px] text-[var(--vscode-descriptionForeground)]">
										{tr("customProviderIdHint")}
									</span>
								</div>
							) : null}

							<div className={editing.mode === "create" ? "" : "md:col-span-2"}>
								<label
									className="block text-xs font-medium mb-1 text-[var(--vscode-foreground)]"
									htmlFor="cp-name">
									{tr("customProviderNameLabel")}{" "}
									<span className="text-[var(--vscode-errorForeground)]">*</span>
								</label>
								<input
									data-testid="custom-provider-name"
									disabled={busy}
									id="cp-name"
									onChange={(e) => updateForm({ name: e.target.value })}
									placeholder={tr("customProviderNamePlaceholder")}
									style={INPUT_STYLE}
									value={editing.form.name}
								/>
							</div>
						</div>

						{/* Base URL */}
						<div>
							<label
								className="block text-xs font-medium mb-1 text-[var(--vscode-foreground)]"
								htmlFor="cp-base-url">
								{tr("baseUrlLabel")} <span className="text-[var(--vscode-errorForeground)]">*</span>
							</label>
							<input
								data-testid="custom-provider-base-url"
								disabled={busy}
								id="cp-base-url"
								onChange={(e) => updateForm({ baseUrl: e.target.value })}
								placeholder={
									editing.mode === "edit"
										? tr("customProviderBaseUrlKeepPlaceholder")
										: tr("customProviderBaseUrlExamplePlaceholder")
								}
								style={INPUT_STYLE}
								value={editing.form.baseUrl}
							/>
						</div>

						{/* API Key */}
						<div>
							<label
								className="block text-xs font-medium mb-1 text-[var(--vscode-foreground)]"
								htmlFor="cp-api-key">
								{tr("apiKeyPlaceholder")}
							</label>
							<div className="relative">
								<input
									data-testid="custom-provider-api-key"
									disabled={busy}
									id="cp-api-key"
									onChange={(e) =>
										updateForm({ apiKey: sanitizeMaskedApiKeyInput(e.target.value, savedApiKeyMask) ?? "" })
									}
									placeholder={
										editing.mode === "edit"
											? tr("customProviderApiKeyKeepPlaceholder")
											: tr("apiKeyPlaceholder")
									}
									style={{ ...INPUT_STYLE, paddingRight: 28 }}
									type={showApiKey ? "text" : "password"}
									value={editing.form.apiKey || savedApiKeyMask}
								/>
								<button
									aria-label={showApiKey ? tr("apiKeyHideLabel") : tr("apiKeyShowLabel")}
									className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--vscode-descriptionForeground)] hover:text-[var(--vscode-foreground)]"
									data-testid="custom-provider-api-key-toggle"
									disabled={busy}
									onClick={() => setShowApiKey((visible) => !visible)}
									title={showApiKey ? tr("apiKeyHideLabel") : tr("apiKeyShowLabel")}
									type="button">
									{showApiKey ? <EyeOff aria-hidden size={14} /> : <Eye aria-hidden size={14} />}
								</button>
							</div>{" "}
							<span className="text-[10px] text-[var(--vscode-descriptionForeground)]">
								{tr("customProviderApiKeyHint")}
							</span>
						</div>

						{/* Automatic Model Discovery & Model List */}
						<div className="p-2.5 rounded border border-[var(--vscode-widget-border,rgba(128,128,128,0.25))] bg-[var(--vscode-sideBar-background,var(--vscode-editor-background))] flex flex-col gap-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold text-[var(--vscode-foreground)]">
									{tr("modelConfiguration")}
								</span>
								<button
									className="px-2 py-0.5 text-xs rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] flex items-center gap-1"
									data-testid="custom-provider-fetch-models"
									disabled={busy || isFetchingModels}
									onClick={() => void fetchModelsFromEndpoint()}
									type="button">
									{isFetchingModels ? (
										<span>{tr("customProviderFetching")}</span>
									) : (
										<>
											<span>⚡ {tr("customProviderFetchModels")}</span>
										</>
									)}
								</button>
							</div>

							{fetchModelStatus?.success && (
								<div className="text-[11px] text-green-500 font-medium">✓ {fetchModelStatus.success}</div>
							)}
							{fetchModelStatus?.error && (
								<div className="text-[11px] text-[var(--vscode-errorForeground)]">⚠ {fetchModelStatus.error}</div>
							)}

							{/* Models input */}
							<div>
								<label
									className="block text-xs font-medium mb-1 text-[var(--vscode-foreground)]"
									htmlFor="cp-models">
									{tr("customProviderModelsLabel")}
								</label>
								<input
									data-testid="custom-provider-models"
									disabled={busy}
									id="cp-models"
									onChange={(e) => updateForm({ modelsText: e.target.value })}
									placeholder={
										editing.mode === "edit"
											? tr("customProviderModelsKeepPlaceholder")
											: tr("customProviderModelsExamplePlaceholder")
									}
									style={INPUT_STYLE}
									value={editing.form.modelsText}
								/>
							</div>

							{/* Default Model */}
							<div>
								<label
									className="block text-xs font-medium mb-1 text-[var(--vscode-foreground)]"
									htmlFor="cp-default-model">
									{tr("customProviderDefaultModelLabel")}
								</label>
								{parsedModelIds.length > 0 ? (
									<div className="flex gap-2 items-center">
										<select
											className="flex-1"
											data-testid="custom-provider-default-model-select"
											disabled={busy}
											onChange={(e) => updateForm({ defaultModelId: e.target.value })}
											style={SELECT_STYLE}
											value={editing.form.defaultModelId}>
											<option value="">{tr("customProviderDefaultModelOption")}</option>
											{parsedModelIds.map((m) => (
												<option key={m} value={m}>
													{m}
												</option>
											))}
										</select>
										<input
											className="flex-1"
											data-testid="custom-provider-default-model"
											disabled={busy}
											onChange={(e) => updateForm({ defaultModelId: e.target.value })}
											placeholder={tr("customProviderDefaultModelTypePlaceholder")}
											style={INPUT_STYLE}
											value={editing.form.defaultModelId}
										/>
									</div>
								) : (
									<input
										data-testid="custom-provider-default-model"
										disabled={busy}
										id="cp-default-model"
										onChange={(e) => updateForm({ defaultModelId: e.target.value })}
										placeholder={tr("customProviderDefaultModelExamplePlaceholder")}
										style={INPUT_STYLE}
										value={editing.form.defaultModelId}
									/>
								)}
							</div>
						</div>

						{/* Collapsible Advanced Section */}
						<div>
							<button
								className="text-xs font-medium text-[var(--vscode-descriptionForeground)] hover:text-[var(--vscode-foreground)] flex items-center gap-1 p-0 bg-transparent border-0 cursor-pointer"
								data-testid="custom-provider-advanced-toggle"
								onClick={() => setShowAdvanced(!showAdvanced)}
								type="button">
								<span>{showAdvanced ? "▼" : "▶"}</span>
								<span>{tr("customProviderAdvancedToggle")}</span>
							</button>

							{showAdvanced && (
								<div className="mt-2 p-2.5 rounded border border-[var(--vscode-widget-border,rgba(128,128,128,0.2))] flex flex-col gap-2.5">
									{/* Models Source URL */}
									<div>
										<label
											className="block text-xs font-medium mb-1 text-[var(--vscode-foreground)]"
											htmlFor="cp-source-url">
											{tr("customProviderSourceUrlLabel")}
										</label>
										<input
											data-testid="custom-provider-models-source-url"
											disabled={busy}
											id="cp-source-url"
											onChange={(e) => updateForm({ modelsSourceUrl: e.target.value })}
											placeholder={formatString(tr, "defaultValue", { value: "{baseUrl}/models" })}
											style={INPUT_STYLE}
											value={editing.form.modelsSourceUrl}
										/>
										<span className="text-[10px] text-[var(--vscode-descriptionForeground)]">
											{tr("customProviderSourceUrlHint")}
										</span>
									</div>

									{/* Custom Headers */}
									<div>
										<div className="flex items-center justify-between mb-1.5">
											<span className="text-xs font-medium text-[var(--vscode-foreground)]">
												{tr("customHeadersLabel")}
											</span>
											<button
												className="px-2 py-0.5 text-xs rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)]"
												data-testid="custom-provider-header-add"
												disabled={busy}
												onClick={() =>
													updateForm({ headers: [...editing.form.headers, { key: "", value: "" }] })
												}
												type="button">
												{tr("customProviderAddHeader")}
											</button>
										</div>

										{editing.form.headers.map((row, index) => (
											<div className="flex items-center gap-2 mb-1.5" key={index}>
												<input
													data-testid={`custom-provider-header-key-${index}`}
													disabled={busy}
													onChange={(event) => {
														const headers = editing.form.headers.map((current, i) =>
															i === index ? { ...current, key: event.target.value } : current,
														)
														updateForm({ headers })
													}}
													placeholder={tr("headerNamePlaceholder")}
													style={{ ...INPUT_STYLE, flex: 1 }}
													value={row.key}
												/>
												<input
													data-testid={`custom-provider-header-value-${index}`}
													disabled={busy}
													onChange={(event) => {
														const headers = editing.form.headers.map((current, i) =>
															i === index ? { ...current, value: event.target.value } : current,
														)
														updateForm({ headers })
													}}
													placeholder={tr("headerValuePlaceholder")}
													style={{ ...INPUT_STYLE, flex: 1 }}
													value={row.value}
												/>
												<button
													className="px-2 py-1 text-xs text-[var(--vscode-errorForeground)] hover:bg-[var(--vscode-inputValidation-errorBackground,rgba(255,0,0,0.1))] rounded"
													data-testid={`custom-provider-header-remove-${index}`}
													disabled={busy}
													onClick={() =>
														updateForm({
															headers: editing.form.headers.filter((_, i) => i !== index),
														})
													}
													type="button">
													✕
												</button>
											</div>
										))}
									</div>
								</div>
							)}
						</div>

						{/* Form Actions */}
						<div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--vscode-widget-border,rgba(128,128,128,0.2))]">
							<button
								className="px-3 py-1 text-xs rounded border border-[var(--vscode-button-border,transparent)] bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)]"
								data-testid="custom-provider-cancel"
								disabled={busy}
								onClick={() => setEditing(null)}
								type="button">
								{tr("customProviderCancel")}
							</button>
							<button
								className="px-3.5 py-1 text-xs font-medium rounded border border-[var(--vscode-button-border,transparent)]"
								data-testid="custom-provider-save"
								disabled={busy}
								onClick={() => void submit()}
								style={{
									background: "var(--vscode-button-background)",
									color: "var(--vscode-button-foreground)",
									opacity: busy ? 0.6 : 1,
									cursor: busy ? "default" : "pointer",
								}}
								type="button">
								{editing.mode === "create" ? tr("customProviderCreate") : tr("customProviderSaveChanges")}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
