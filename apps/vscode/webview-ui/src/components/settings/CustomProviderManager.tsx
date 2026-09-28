import { StringRequest } from "@shared/proto/cline/common"
import { CustomProviderMutationRequest, type ProviderListing } from "@shared/proto/cline/models"
import { useCallback, useMemo, useState } from "react"
import { useProviderListings } from "@/hooks/useProviderListings"
import { ModelsServiceClient } from "@/services/grpc-client"

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

function toFormState(provider: ProviderListing): FormState {
	// The listing carries no secrets or model ids: the API key is write-only
	// and models stay untouched when left blank on update.
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
		modelsSourceUrl: form.modelsSourceUrl.trim(),
	})
}

/**
 * Settings card for multi custom-provider management (add / edit / delete).
 * Every mutation rejects visibly on failure — an error never masquerades as
 * an empty list (the fix.40 lesson).
 */
export const CustomProviderManager = () => {
	const { providers, refresh } = useProviderListings()
	const customProviders = useMemo(() => providers.filter((provider) => provider.isCustom), [providers])

	const [editing, setEditing] = useState<{ mode: "create" | "edit"; form: FormState } | null>(null)
	const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const openCreate = useCallback(() => {
		setError(null)
		setConfirmingDeleteId(null)
		setEditing({ mode: "create", form: { ...EMPTY_FORM } })
	}, [])

	const openEdit = useCallback((provider: ProviderListing) => {
		setError(null)
		setConfirmingDeleteId(null)
		setEditing({ mode: "edit", form: toFormState(provider) })
	}, [])

	const updateForm = useCallback((patch: Partial<FormState>) => {
		setEditing((current) => (current ? { ...current, form: { ...current.form, ...patch } } : current))
	}, [])

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

	return (
		<div className="mb-2.5" data-testid="custom-provider-manager">
			<div className="flex items-center justify-between mb-1">
				<span style={{ fontWeight: 500 }}>Custom providers</span>
				<button
					data-testid="custom-provider-add"
					disabled={busy || editing !== null}
					onClick={openCreate}
					style={{
						background: "var(--vscode-button-background)",
						color: "var(--vscode-button-foreground)",
						padding: "2px 10px",
						minHeight: 24,
						border: "1px solid var(--vscode-button-border, transparent)",
						cursor: busy || editing ? "default" : "pointer",
					}}>
					Add provider
				</button>
			</div>

			{error && (
				<div
					data-testid="custom-provider-error"
					role="alert"
					style={{ color: "var(--vscode-errorForeground)", marginBottom: 6 }}>
					{error}
				</div>
			)}

			{customProviders.length === 0 && !editing && (
				<div className="text-description text-sm mb-1">No custom providers yet — add one to use your own gateway.</div>
			)}

			{customProviders.map((provider) => (
				<div
					className="flex items-center gap-2 mb-1"
					data-testid={`custom-provider-row-${provider.id}`}
					key={provider.id}
					style={{ borderBottom: "1px solid var(--vscode-widget-border, transparent)", paddingBottom: 4 }}>
					<div className="flex-1" style={{ minWidth: 0 }}>
						<div style={{ fontWeight: 500 }}>{provider.name}</div>
						<div className="text-description text-sm" style={{ fontFamily: "monospace" }}>
							{provider.id}
							{provider.defaultModelId ? ` · ${provider.defaultModelId}` : ""}
						</div>
					</div>
					<button
						data-testid={`custom-provider-edit-${provider.id}`}
						disabled={busy}
						onClick={() => openEdit(provider)}
						style={{ cursor: busy ? "default" : "pointer" }}>
						Edit
					</button>
					{confirmingDeleteId === provider.id ? (
						<button
							data-testid={`custom-provider-delete-confirm-${provider.id}`}
							disabled={busy}
							onClick={() => void remove(provider.id)}
							style={{ color: "var(--vscode-errorForeground)", cursor: busy ? "default" : "pointer" }}>
							Confirm delete?
						</button>
					) : (
						<button
							data-testid={`custom-provider-delete-${provider.id}`}
							disabled={busy}
							onClick={() => setConfirmingDeleteId(provider.id)}
							style={{ color: "var(--vscode-errorForeground)", cursor: busy ? "default" : "pointer" }}>
							Delete
						</button>
					)}
				</div>
			))}

			{editing && (
				<div
					className="mb-2.5"
					data-testid="custom-provider-form"
					style={{ border: "1px solid var(--vscode-widget-border)", padding: 10 }}>
					<div style={{ fontWeight: 500, marginBottom: 6 }}>
						{editing.mode === "create" ? "Add custom provider" : `Edit ${editing.form.providerId}`}
					</div>

					{editing.mode === "create" && (
						<label className="block mb-1">
							<span style={{ fontWeight: 500 }}>Provider ID</span>
							<input
								data-testid="custom-provider-id"
								disabled={busy}
								onChange={(event) => updateForm({ providerId: event.target.value })}
								placeholder="e.g. my-gateway (lowercase, fixed after creation)"
								style={{ width: "100%", marginBottom: 6 }}
								value={editing.form.providerId}
							/>
						</label>
					)}

					<label className="block mb-1">
						<span style={{ fontWeight: 500 }}>Name</span>
						<input
							data-testid="custom-provider-name"
							disabled={busy}
							onChange={(event) => updateForm({ name: event.target.value })}
							placeholder="Display name"
							style={{ width: "100%", marginBottom: 6 }}
							value={editing.form.name}
						/>
					</label>

					<label className="block mb-1">
						<span style={{ fontWeight: 500 }}>Base URL</span>
						<input
							data-testid="custom-provider-base-url"
							disabled={busy}
							onChange={(event) => updateForm({ baseUrl: event.target.value })}
							placeholder={
								editing.mode === "edit" ? "Leave blank to keep the current URL" : "https://gateway.example/v1"
							}
							style={{ width: "100%", marginBottom: 6 }}
							value={editing.form.baseUrl}
						/>
					</label>

					<label className="block mb-1">
						<span style={{ fontWeight: 500 }}>API key</span>
						<input
							data-testid="custom-provider-api-key"
							disabled={busy}
							onChange={(event) => updateForm({ apiKey: event.target.value })}
							placeholder={editing.mode === "edit" ? "Leave blank to keep the stored key" : "Enter API key..."}
							style={{ width: "100%", marginBottom: 6 }}
							type="password"
							value={editing.form.apiKey}
						/>
					</label>

					<label className="block mb-1">
						<span style={{ fontWeight: 500 }}>Models</span>
						<input
							data-testid="custom-provider-models"
							disabled={busy}
							onChange={(event) => updateForm({ modelsText: event.target.value })}
							placeholder={
								editing.mode === "edit"
									? "Leave blank to keep current models (comma-separated to replace)"
									: "Comma-separated model ids, e.g. gpt-5.6-sol"
							}
							style={{ width: "100%", marginBottom: 6 }}
							value={editing.form.modelsText}
						/>
					</label>

					<label className="block mb-1">
						<span style={{ fontWeight: 500 }}>Default model</span>
						<input
							data-testid="custom-provider-default-model"
							disabled={busy}
							onChange={(event) => updateForm({ defaultModelId: event.target.value })}
							placeholder="Model id selected by default"
							style={{ width: "100%", marginBottom: 6 }}
							value={editing.form.defaultModelId}
						/>
					</label>

					<label className="block mb-1">
						<span style={{ fontWeight: 500 }}>Models source URL (optional)</span>
						<input
							data-testid="custom-provider-models-source-url"
							disabled={busy}
							onChange={(event) => updateForm({ modelsSourceUrl: event.target.value })}
							placeholder="e.g. https://gateway.example/v1/models — fetches the model list + limits"
							style={{ width: "100%", marginBottom: 6 }}
							value={editing.form.modelsSourceUrl}
						/>
					</label>

					<div className="mb-1">
						<span style={{ fontWeight: 500 }}>Custom headers</span>
						{editing.form.headers.map((row, index) => (
							<div className="flex items-center gap-2 mb-1" key={index}>
								<input
									data-testid={`custom-provider-header-key-${index}`}
									disabled={busy}
									onChange={(event) => {
										const headers = editing.form.headers.map((current, i) =>
											i === index ? { ...current, key: event.target.value } : current,
										)
										updateForm({ headers })
									}}
									placeholder="Header name"
									style={{ flex: 1 }}
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
									placeholder="Value"
									style={{ flex: 1 }}
									value={row.value}
								/>
								<button
									data-testid={`custom-provider-header-remove-${index}`}
									disabled={busy}
									onClick={() => updateForm({ headers: editing.form.headers.filter((_, i) => i !== index) })}>
									✕
								</button>
							</div>
						))}
						<button
							data-testid="custom-provider-header-add"
							disabled={busy}
							onClick={() => updateForm({ headers: [...editing.form.headers, { key: "", value: "" }] })}>
							Add header
						</button>
					</div>

					<div className="flex items-center gap-2" style={{ marginTop: 8 }}>
						<button
							data-testid="custom-provider-save"
							disabled={busy}
							onClick={() => void submit()}
							style={{
								background: "var(--vscode-button-background)",
								color: "var(--vscode-button-foreground)",
								padding: "2px 12px",
								minHeight: 24,
								cursor: busy ? "default" : "pointer",
							}}>
							{editing.mode === "create" ? "Create provider" : "Save changes"}
						</button>
						<button data-testid="custom-provider-cancel" disabled={busy} onClick={() => setEditing(null)}>
							Cancel
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
