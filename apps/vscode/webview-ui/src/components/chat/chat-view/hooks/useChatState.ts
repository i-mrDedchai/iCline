import { ClineMessage } from "@shared/ExtensionMessage"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { readComposerDraft, writeComposerDraftAttachments, writeComposerDraftText } from "@/icline/composerDraftStorage"
import { ChatState, PendingUserMessage } from "../types/chatTypes"

/**
 * Custom hook for managing chat state
 * Handles input values, selection states, and UI state
 */
export function useChatState(messages: ClineMessage[]): ChatState {
	// The composer's contents are restored from the draft store: VS Code throws the webview away
	// when the view is moved to the secondary side bar, and an unsent message has to come back
	// with it. Read once per mount, before the first paint, so the textarea never flashes empty.
	const [draftAtMount] = useState(readComposerDraft)
	// Input and selection state
	const [inputValue, setInputValue] = useState(draftAtMount.text)
	const [activeQuote, setActiveQuote] = useState<string | null>(null)
	const [isTextAreaFocused, setIsTextAreaFocused] = useState(false)
	const [selectedImages, setSelectedImages] = useState<string[]>(draftAtMount.images)
	const [selectedFiles, setSelectedFiles] = useState<string[]>(draftAtMount.files)

	// UI state
	const [sendingDisabled, setSendingDisabled] = useState(false)
	const [enableButtons, setEnableButtons] = useState<boolean>(false)
	const [primaryButtonText, setPrimaryButtonText] = useState<string | undefined>("Approve")
	const [secondaryButtonText, setSecondaryButtonText] = useState<string | undefined>("Reject")
	const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})
	const [pendingUserMessage, setPendingUserMessage] = useState<PendingUserMessage | undefined>(undefined)

	// Refs
	const textAreaRef = useRef<HTMLTextAreaElement>(null)

	// Write the composer through to the draft store as it changes. Sending a message clears the
	// input, which clears the draft with it: the store follows the composer, it does not decide
	// anything of its own. Text and attachments are separate effects so that typing only ever
	// re-serializes the text (`composerDraftStorage` explains why).
	useEffect(() => {
		writeComposerDraftText(inputValue)
	}, [inputValue])

	useEffect(() => {
		writeComposerDraftAttachments(selectedImages, selectedFiles)
	}, [selectedImages, selectedFiles])

	// Derived state
	const lastMessage = useMemo(() => messages.at(-1), [messages])
	const secondLastMessage = useMemo(() => messages.at(-2), [messages])
	const clineAsk = useMemo(() => (lastMessage?.type === "ask" ? lastMessage.ask : undefined), [lastMessage])

	// Clear expanded rows when task changes
	const task = useMemo(() => messages.at(0), [messages])
	const clearExpandedRows = useCallback(() => {
		setExpandedRows({})
	}, [])

	// Reset state when starting new conversation. The draft goes with it — the write-through
	// effects store the emptied composer, so nothing else has to remember to clear it.
	const resetState = useCallback(() => {
		setInputValue("")
		setActiveQuote(null)
		setSelectedImages([])
		setSelectedFiles([])
	}, [])

	// Handle focus change
	const handleFocusChange = useCallback((isFocused: boolean) => {
		setIsTextAreaFocused(isFocused)
	}, [])

	// Auto-expand last message row when task or messages first changed.
	useEffect(() => {
		clearExpandedRows()
	}, [task?.ts, clearExpandedRows])

	return {
		// State values
		inputValue,
		setInputValue,
		activeQuote,
		setActiveQuote,
		isTextAreaFocused,
		setIsTextAreaFocused,
		selectedImages,
		setSelectedImages,
		selectedFiles,
		setSelectedFiles,
		sendingDisabled,
		setSendingDisabled,
		enableButtons,
		setEnableButtons,
		primaryButtonText,
		setPrimaryButtonText,
		secondaryButtonText,
		setSecondaryButtonText,
		expandedRows,
		setExpandedRows,
		pendingUserMessage,
		setPendingUserMessage,

		// Refs
		textAreaRef,

		// Derived values
		lastMessage,
		secondLastMessage,
		clineAsk,
		task,

		// Handlers
		handleFocusChange,
		clearExpandedRows,
		resetState,
	}
}
