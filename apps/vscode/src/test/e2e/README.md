# E2E Tests

This directory contains the end-to-end tests for the Cline VS Code extension using Playwright. These tests simulate user interactions with the extension in a real VS Code environment.

## Test Structure

The E2E test suite consists of several key components:

### Test Files

- **`auth.test.ts`** - Tests API key setup, provider selection, and navigation to settings
- **`chat.test.ts`** - Tests chat functionality including message sending, mode switching (Plan/Act), slash commands, and @ mentions
- **`diff.test.ts`** - Tests the diff editor functionality for file modifications
- **`editor.test.ts`** - Tests code actions, editor panel integration, and code selection features

### Test Infrastructure

- **`utils/helpers.ts`** - Core test utilities and fixtures including:
  - `e2e` - Main test fixture for single-root workspace tests
  - `e2eMultiRoot` - Test fixture for multi-root workspace tests
  - `E2ETestHelper` - Helper class with utilities for VS Code interaction
- **`utils/common.ts`** - Common utility functions for UI interactions
- **`utils/global.setup.ts`** - Global test setup and cleanup
- **`utils/build.mjs`** - Build script for test environment preparation

### Test Fixtures

- **`fixtures/workspace/`** - Single-root workspace test files (HTML, TypeScript, etc.)
- **`fixtures/workspace_2/`** - Additional workspace with Python provider files
- **`fixtures/multiroots.code-workspace`** - Multi-root workspace configuration
- **`fixtures/server/`** - Mock API server for testing Cline's backend interactions

## Running Tests

### Parallel Workers

Each test drives its own VS Code window, and each WORKER gets its own mock API server and its
own copy of the workspace fixtures, so the suite runs several windows at once by default
(`workers` in `playwright.config.ts`: 3 locally, 2 on CI). 16 tests take ~2.5 min that way
against ~4.5 min serially.

```bash
E2E_WORKERS=1 bun run e2e   # serial, for reading a single failure in order
E2E_WORKERS=6 bun run e2e   # more windows, more memory
```

### Basic Test Execution

To build the test environment and run all E2E tests:

```bash
bun run test:e2e
```

To run all E2E tests without re-building the test environment (e.g. only test files were updated):

```bash
bun run e2e
```

### Debug Mode

To run E2E tests in debug mode with Playwright's interactive debugger:

```bash
bun run test:e2e -- --debug
# Or only run the tests without re-building
bun run e2e -- --debug
```

In debug mode, Playwright will:
- Open a browser window showing the VS Code instance
- Pause execution at the beginning of each test
- Allow you to step through test actions
- Provide a console for inspecting elements and state

### Additional Options

Run specific test files:
```bash
bun run e2e -- auth.test.ts
```

Run tests with specific tags or patterns:
```bash
bun run e2e -- --grep "Chat"
```

Run tests in headed mode (visible browser):
```bash
bun run e2e -- --headed
```

## Writing Tests

### Basic Test Structure

Use the `e2e` fixture for single-root workspace tests:

```typescript
import { expect } from "@playwright/test"
import { e2e } from "./utils/helpers"

e2e("Test description", async ({ sidebar, helper, page }) => {
  // Sign in to Cline
  await helper.signin(sidebar)
  
  // Test interactions
  const inputbox = sidebar.getByTestId("chat-input")
  await inputbox.fill("Hello, Cline!")
  await sidebar.getByTestId("send-button").click()
  
  // Assertions
  await expect(sidebar.getByText("API Request...")).toBeVisible()
})
```

For multi-root workspace tests, use `e2eMultiRoot`:

```typescript
import { e2eMultiRoot } from "./utils/helpers"

e2eMultiRoot("[Multi-roots] Test description", async ({ sidebar, helper }) => {
  // Test implementation
})
```

### Available Fixtures

The test fixtures provide the following objects:

- **`sidebar`** - Playwright Frame object for the Cline extension's sidebar
- **`helper`** - E2ETestHelper instance with utility methods
- **`page`** - Playwright Page object for the main VS Code window
- **`app`** - ElectronApplication instance for VS Code
- **`server`** - Mock API server for backend testing (this worker's own instance)
- **`privateWorkspaces`** - Temp dir holding this test's private copy of the fixtures
- **`workspaceDir`** / **`multiRootWorkspaceDir`** - The test's own copy of a workspace (the
  extension edits real files in the open folder, so a copy is what keeps parallel tests apart)
- **`pane`** - Width/location controller for the pane the chat lives in (`utils/pane.ts`):
  `measure()`, `widenTo(px)` (drags VS Code's own sash), `location()` and
  `moveToAuxiliaryBar()` (drives VS Code's own `View: Move View` flow). The move returns the
  frame the chat lives in afterwards, because moving between parts re-creates the webview
- **`widePane`** - A REQUEST, not an assertion: naming it in a test widens the pane to
  `PANE_WIDE_WIDTH_PX` (900) before the body runs and resolves to the width reached. VS Code's
  default sidebar (~300px) is narrower than the composer row needs

### Driving VS Code's own UI from a test

Two hazards cost a debugging session each; both are handled inside `utils/pane.ts`, so use its
helpers rather than re-deriving them:

1. **The chat webview takes focus back.** The composer re-focuses itself whenever a turn ends
   (`ChatView`, ~50ms after the turn goes idle) so the user can keep typing, and VS Code hides
   its quick input the moment that input loses focus. A palette opened in that window closes on
   its own with the query sitting in a hidden box (measured: focus was on the webview `<iframe>`
   and the widget hidden within 500ms). Hence `typeInPalette()` re-opens the palette until it
   stays, and queries are written with `fill` — a `pressSequentially` query got cut to `>Move V`
   when the widget vanished mid-word. The palette's `>` prefix is its mode: never fill an empty
   string into it.
2. **A quick pick row is two elements.** VS Code renders a `.quick-input-list-row` label wrapper
   (content-sized, and duplicated by a zero-height sibling) inside a `.monaco-list-row[role="option"]`
   that carries the hit area and the accessible name — click the `option`. `clickRow()` matches
   that name at the start, because a row that opens a group carries its group's separator too
   ("New Secondary Side Bar Entry, Secondary Side Bar"), and it reports the rows that WERE shown
   when the one you asked for is missing.

### Common Patterns

#### Authentication
```typescript
// Sign in with test API key
await helper.signin(sidebar)
```

#### Chat Interactions
```typescript
const inputbox = sidebar.getByTestId("chat-input")
await inputbox.fill("Your message")
await sidebar.getByTestId("send-button").click()
```

#### Mode Switching
```typescript
const actButton = sidebar.getByRole("switch", { name: "Act" })
const planButton = sidebar.getByRole("switch", { name: "Plan" })
await actButton.click() // Switch to Plan mode
```

#### File Operations
```typescript
// Open file explorer and select code
await openTab(page, "Explorer ")
await page.getByRole("treeitem", { name: "index.html" }).locator("a").click()
await addSelectedCodeToClineWebview(page)
```

#### Settings Navigation
```typescript
await sidebar.getByText("settings").click()
await sidebar.getByTestId("tab-api-config").click()
```

### Using the Recorder with Debug Mode

The `--debug` flag enables Playwright's interactive debugging features:

1. **Start debugging session:**
   ```bash
   bun run test:e2e -- --debug
   ```

2. **Playwright will open:**
   - A VS Code window with Cline extension loaded
   - Playwright Inspector for step-by-step debugging
   - Browser developer tools for element inspection

3. **Recording interactions:**
   - Use the "Record" button in Playwright Inspector
   - Interact with the VS Code interface
   - Playwright generates test code automatically
   - Copy the generated code into your test files

4. **Debugging existing tests:**
   - Set breakpoints in your test code
   - Use the "Step over" button to execute line by line
   - Inspect element selectors and page state
   - Modify selectors and retry actions

### Test Environment

The test environment includes:

- **VS Code Configuration:**
  - Disabled updates, workspace trust, and welcome screens
  - Extension development mode with Cline loaded
  - Temporary user data and extensions directories

- **Mock API Server:**
  - One instance per Playwright WORKER, on an OS-assigned port (the `server` fixture starts it with port 0)
  - The extension under test is pointed at that port through `CLINE_API_BASE_URL`, which
    `src/config.ts` honours over the environment's own API URL (`local` would otherwise be
    hard-coded to `localhost:7777`)
  - Provides mock responses for Cline API calls
  - Supports authentication, chat completions, and user management
  - `scripts/interactive-playwright.ts` and `scripts/test-standalone-core-api-server.ts` still
    start it on the default `localhost:7777`, which is what the SDK's `local` environment expects

- **Test Workspaces:**
  - Single-root workspace with HTML, TypeScript, and README files
  - Multi-root workspace with Python provider examples
  - Configurable through fixtures

### Best Practices

1. **Use semantic selectors:**
   ```typescript
   // Good - uses test IDs
   sidebar.getByTestId("chat-input")
   
   // Good - uses roles and accessible names
   sidebar.getByRole("button", { name: "Send" })
   
   // Avoid - brittle CSS selectors
   sidebar.locator(".chat-input-class")
   ```

2. **Wait for elements:**
   ```typescript
   await expect(sidebar.getByText("Loading...")).toBeVisible()
   await expect(sidebar.getByText("Complete")).toBeVisible()
   ```

3. **Clean up state:**
   ```typescript
   // Use helper functions for common cleanup
   await cleanChatView(page)
   ```

4. **Handle async operations:**
   ```typescript
   // Wait for API responses
   await expect(sidebar.getByText("API Request...")).toBeVisible()
   await expect(sidebar.getByText("Response received")).toBeVisible()
   ```

5. **Test both success and error cases:**
   ```typescript
   // Test successful flow
   await helper.signin(sidebar)
   
   // Test error handling
   await expect(sidebar.getByText("API Request Failed")).toBeVisible()
   ```

### Debugging Tips

- Use `page.pause()` to pause execution and inspect the current state
- Add `console.log()` statements to track test progress
- Use `--headed` flag to see the browser window during test execution
- Check video recordings in `test-results/` for failed tests
- Use browser developer tools to inspect element selectors

### Environment Variables

- `CLINE_E2E_TESTS_VERBOSE=true` - Enable verbose logging
- `CI=true` - Adjusts timeouts and reporting for CI environments
- `GRPC_RECORDER_ENABLED=true` - Enable gRPC recording for debugging
