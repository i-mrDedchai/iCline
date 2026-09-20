/**
 * The organization's provider policy, as the webview can see it.
 *
 * `remoteConfiguredProviders` is the allowed list the control plane publishes (see
 * the host's `transformRemoteConfigToStateShape`). It is also what the Settings
 * provider dropdown filters on, so a blocked provider never appears there — but the
 * Quick Picker lists every provider's models, so a click on a blocked one used to
 * look successful while the host's remote layer (org policy, highest precedence)
 * kept the pinned provider. The chip then snapped back on the next state push with
 * no explanation: the same "did it take?" confusion as the fix.15 pin bug, this
 * time for a legitimate reason.
 *
 * This module only decides whether a provider is allowed; the wording lives in
 * `components/common/OrgProviderPolicyNotice`.
 */

/** The slice of the posted remote-config settings this rule reads. */
export interface OrgProviderPolicySource {
	remoteConfiguredProviders?: readonly string[] | null
}

export interface OrgProviderBlock {
	/** Providers the organization allows, in the order the control plane sent them. */
	allowed: string[]
	/** The provider the user tried to select — not in `allowed`. */
	requested: string
}

/**
 * Why a provider cannot be selected, or `undefined` when it can.
 *
 * An empty/absent allowed list means "no policy": every provider is selectable, which
 * is also what the host assumes (`isProviderValid` returns true for an empty list).
 */
export function orgProviderBlock(
	remoteConfigSettings: OrgProviderPolicySource | undefined | null,
	legacyProvider: string,
): OrgProviderBlock | undefined {
	const allowed = (remoteConfigSettings?.remoteConfiguredProviders ?? [])
		.map((provider) => provider?.trim?.() ?? "")
		.filter((provider) => provider.length > 0)
	if (allowed.length === 0 || allowed.includes(legacyProvider)) {
		return undefined
	}
	return { allowed, requested: legacyProvider }
}
