---
inclusion: auto
---

# Verified Locator Knowledge — simulapp.online (TeleConnect)

This file contains **verified, production-correct locators** from live DOM inspection. 
When generating test scripts, ALWAYS use these locators. Do NOT guess `data-testid` values.

---

## Critical Rules for Locator Generation

1. **ALWAYS inspect the live app** (via Playwright MCP browser) before adding NEW locators to `.properties` files
2. **NEVER guess `data-testid` values** — the app's naming is inconsistent (e.g., `btn-new-connection` not `btn-connection`)
3. **Labels on forms use `<label for="...">` pattern** — NOT `data-testid` attributes
4. **Reuse existing locators** from `src/pages/properties/TeleConnect.properties` whenever possible
5. **When in doubt, navigate to the page and snapshot** before writing locators

---

## Verified Locators by Page

### Login Page (simulapp.online)
| Element | Locator | Verified |
|---------|---------|----------|
| Email input | `//input[@data-testid='login-email']` | ✅ |
| Password input | `//input[@data-testid='login-password']` | ✅ |
| Submit button | `//button[@data-testid='login-submit']` | ✅ |

### Customer Dashboard
| Element | Locator | Verified |
|---------|---------|----------|
| Welcome heading | `//h1[@data-testid='welcome-heading']` | ✅ |
| New Connection button | `//button[@data-testid='btn-new-connection']` | ✅ ⚠️ NOT `btn-connection` |
| User name span | `//span[@data-testid='user-name']` | ✅ |

### Order Form — Step 1 (Customer Info)

#### Labels (use `<label for="...">` pattern, NO data-testid!)
| Element | Locator | Text Content | Verified |
|---------|---------|--------------|----------|
| Full Name label | `//label[@for='name']` | "Full Name *" | ✅ |
| Email Address label | `//label[@for='email']` | "Email Address *" | ✅ |
| Phone Number label | `//label[@for='phone']` | "Phone Number *" | ✅ |
| Residential Address label | `//label[@for='address']` | "Residential Address *" | ✅ |
| ID Type label | `//label[@for='idType']` | "ID Type *" | ✅ |
| ID Number label | `//label[@for='idNumber']` | "ID Number *" | ✅ |
| Date of Birth label | `//label[@for='dob']` | "Date of Birth" | ✅ (no asterisk) |
| Gender label | `//label[@for='gender']` | "Gender" | ✅ (no asterisk) |

#### Inputs (use `data-testid` pattern)
| Element | Locator | Verified |
|---------|---------|----------|
| Name input | `//input[@data-testid='input-name']` | ✅ |
| Email input | `//input[@data-testid='input-email']` | ✅ |
| Phone input | `//input[@data-testid='input-phone']` | ✅ |
| Address textarea | `//textarea[@data-testid='input-address']` | ✅ |
| ID Type select | `//select[@data-testid='select-id-type']` | ✅ |
| ID Number input | `//input[@data-testid='input-id-number']` | ✅ |

#### Step Navigation
| Element | Locator | Verified |
|---------|---------|----------|
| Step badge | `//span[@data-testid='step-badge']` | ✅ |
| Continue button | `//button[@data-testid='btn-next']` | ✅ |
| Back button | `//button[@data-testid='btn-back']` | ✅ |

---

## Locator Patterns Learned

1. **Buttons**: `data-testid='btn-<action>'` (e.g., `btn-new-connection`, `btn-submit-order`, `btn-next`)
2. **Inputs**: `data-testid='input-<field>'` (e.g., `input-name`, `input-email`)
3. **Selects**: `data-testid='select-<field>'` (e.g., `select-gender`, `select-id-type`)
4. **Textareas**: `data-testid='input-<field>'` (same pattern as inputs)
5. **Labels**: `<label for='<fieldId'>` — NO data-testid on labels!
6. **Error messages**: `data-testid='error-<fieldName>'` (camelCase, e.g., `error-customerName`)
7. **Nav links**: `data-testid='nav-<destination>'` (e.g., `nav-dashboard`, `nav-orders`)

---

## Known Pitfalls

| Issue | Example | Correct |
|-------|---------|---------|
| Button testid uses full action name | ❌ `btn-connection` | ✅ `btn-new-connection` |
| Labels don't have data-testid | ❌ `//label[@data-testid='label-name']` | ✅ `//label[@for='name']` |
| Self-healing may pick wrong element | Self-heal picked `user-name` span for label | Always verify healed locators match intent |
| `reports/allure-results` must exist | ENOENT error on report write | Ensure directory exists before runs |

---

## Pre-Run Checklist

Before running any new test scenario:
1. `reports/allure-results` directory exists
2. Locators in `.properties` match this knowledge base
3. If new locators needed → inspect live app FIRST via browser tool
