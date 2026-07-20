# Skill: Generate Element Locators

## Description
Generate `.properties` locator files for new pages or update existing ones when creating test scenarios.

## When to Use
- User needs locators for a new page/section of the application
- Test cases reference elements that don't exist in any `.properties` file yet
- User provides a page screenshot, HTML structure, or element descriptions
- User asks to create a Page Object for a specific page

## Instructions

1. **Determine the page name** (PascalCase):
   - Match existing page names in `src/pages/properties/` if possible
   - New pages: use the application section name (e.g., `Billing`, `Profile`, `OrderTracking`)

2. **Generate locators** in this format:
   ```properties
   # <PageName>.properties
   # <Section description>
   ElementKey=<locator_value>
   ```

3. **Locator strategy priority** (for web):
   1. `data-testid` attribute: `//button[@data-testid='btn-submit']`
   2. Unique `id`: `#submit-btn` or `//*[@id='submit-btn']`
   3. `aria-label`: `//button[@aria-label='Submit form']`
   4. `role` + text: `//button[contains(text(),'Submit')]`
   5. Unique CSS/XPath (last resort): `//div[@class='form-container']//button[1]`

4. **Locator strategy priority** (for native apps):
   1. `accessibility_id:<value>` (preferred — cross-platform)
   2. `id:<resource-id>` (Android)
   3. `xpath://*[@text='<value>']` (fallback)
   4. `class:<class-name>` (least preferred)

5. **Naming conventions** for element keys:
   | Prefix | Usage | Example |
   |--------|-------|---------|
   | `Btn` | Buttons | `BtnSubmit`, `BtnCancel` |
   | `Input` | Text fields | `InputEmail`, `InputPhone` |
   | `Select` | Dropdowns | `SelectCountry`, `SelectPlan` |
   | `Chk` | Checkboxes | `ChkTerms`, `ChkNewsletter` |
   | `Rad` | Radio buttons | `RadMale`, `RadFemale` |
   | `Lbl` / `Label` | Labels | `LblWelcome`, `LabelTotal` |
   | `Error` | Error messages | `ErrorEmail`, `ErrorPassword` |
   | `Link` | Hyperlinks | `LinkForgotPassword` |
   | `Img` | Images | `ImgLogo`, `ImgAvatar` |
   | `Tab` | Tab controls | `TabSettings`, `TabHistory` |
   | `Modal` | Modal dialogs | `ModalConfirm`, `ModalDelete` |
   | (none) | Generic | `WelcomeHeading`, `OrderSuccess` |

## Output Files
- `src/pages/properties/<PageName>.properties`

## Quality Rules
- One `.properties` file per page/section — never mix pages
- Keep locators stable: prefer `data-testid` over position-based selectors
- Use XPath `contains()` sparingly — only when exact match isn't possible
- Comment sections within properties files for organization
- Never duplicate locator keys within the same file
- Locator values must be unique on the page (no ambiguous matches)
- For lists/tables, use indexed patterns: `OrderRow1`, `OrderRow2` or parameterized locators
