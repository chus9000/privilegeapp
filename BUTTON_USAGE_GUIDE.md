# Button Usage Guide

Quick reference for using the standardized button system in Privilege Spectrum.

## Basic Usage

### Primary Button (Main Actions)
```html
<button class="btn btn-primary">Create Event</button>
<button class="btn btn-primary">Sign In</button>
<button class="btn btn-primary">Save</button>
```
**Use for**: Main call-to-action, form submissions, primary navigation

### Secondary Button (Alternative Actions)
```html
<button class="btn btn-secondary">Cancel</button>
<button class="btn btn-secondary">Back</button>
<button class="btn btn-secondary">View Details</button>
```
**Use for**: Secondary actions, cancel buttons, alternative options

### Tertiary Button (Minimal Actions)
```html
<button class="btn btn-tertiary">Toggle</button>
<button class="btn btn-tertiary">Enable</button>
<button class="btn btn-tertiary">Disable</button>
```
**Use for**: Less prominent actions, toggles, inline actions

### Danger Button (Destructive Actions)
```html
<button class="btn btn-danger">Delete</button>
<button class="btn btn-danger">Remove</button>
<button class="btn btn-danger">Clear All</button>
```
**Use for**: Destructive actions, deletions, permanent changes

### Success Button (Positive Actions)
```html
<button class="btn btn-success">Duplicate</button>
<button class="btn btn-success">Confirm</button>
<button class="btn btn-success">Accept</button>
```
**Use for**: Positive confirmations, duplications, approvals

## Size Modifiers

### Small Buttons
```html
<button class="btn btn-primary btn-sm">View</button>
<button class="btn btn-danger btn-sm">Delete</button>
```
**Use for**: Compact spaces, table actions, card footers

### Large Buttons
```html
<button class="btn btn-primary btn-lg">Get Started</button>
<button class="btn btn-secondary btn-lg">Learn More</button>
```
**Use for**: Hero sections, landing pages, prominent CTAs

### Icon-Only Buttons
```html
<button class="btn btn-icon btn-tertiary" title="Copy">
    <i data-lucide="clipboard-copy"></i>
</button>
<button class="btn btn-icon btn-tertiary" title="Close">
    <i data-lucide="x"></i>
</button>
```
**Use for**: Icon actions, copy buttons, close buttons

## Common Patterns

### Form Actions
```html
<div class="form-actions">
    <button type="button" class="btn btn-secondary">Cancel</button>
    <button type="submit" class="btn btn-primary">Submit</button>
</div>
```

### Modal Footer
```html
<div class="modal-footer">
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="save()">Save</button>
</div>
```

### Card Actions
```html
<div class="event-card-footer">
    <button class="btn btn-primary btn-sm">View Details</button>
    <button class="btn btn-success btn-sm">Duplicate</button>
    <button class="btn btn-danger btn-sm">Delete</button>
</div>
```

### Copy Button with Input
```html
<div class="input-with-button">
    <input type="text" value="https://example.com" readonly>
    <button class="btn btn-icon btn-tertiary" title="Copy">
        <i data-lucide="clipboard-copy"></i>
    </button>
</div>
```

### Link as Button
```html
<a href="/dashboard" class="btn btn-primary">Go to Dashboard</a>
<a href="/results" class="btn btn-secondary btn-sm">View Results</a>
```

## Disabled State
```html
<button class="btn btn-primary" disabled>Loading...</button>
<button class="btn btn-secondary" disabled>Unavailable</button>
```

## With Icons
```html
<!-- Icon before text -->
<button class="btn btn-primary">
    <i data-lucide="plus"></i>
    Create New
</button>

<!-- Icon after text -->
<button class="btn btn-secondary">
    Download
    <i data-lucide="download"></i>
</button>
```

## Do's and Don'ts

### ✅ Do
- Use `.btn` as the base class for all buttons
- Combine with one style class (primary, secondary, etc.)
- Add size modifiers when needed (btn-sm, btn-lg)
- Use semantic button types (danger for delete, success for confirm)
- Provide title/aria-label for icon-only buttons
- Use disabled attribute for unavailable actions

### ❌ Don't
- Mix old classes with new (e.g., `primary-btn btn-primary`)
- Use multiple style classes (e.g., `btn-primary btn-secondary`)
- Create custom button styles outside the system
- Use buttons for navigation (use `<a>` with `.btn` classes)
- Forget accessibility attributes on icon buttons
- Override button styles inline

## Accessibility

### Always Include
```html
<!-- For icon-only buttons -->
<button class="btn btn-icon btn-tertiary" 
        title="Copy to clipboard"
        aria-label="Copy to clipboard">
    <i data-lucide="clipboard-copy"></i>
</button>

<!-- For disabled buttons -->
<button class="btn btn-primary" 
        disabled
        aria-disabled="true">
    Submit
</button>

<!-- For loading states -->
<button class="btn btn-primary" 
        disabled
        aria-busy="true">
    <span class="spinner"></span>
    Loading...
</button>
```

## Migration from Old Classes

If you encounter old button classes, update them:

```html
<!-- OLD -->
<button class="primary-btn">Submit</button>
<button class="secondary-btn">Cancel</button>
<button class="delete-event-btn">Delete</button>
<button class="copy-link-btn">Copy</button>
<button class="view-details-btn">View</button>

<!-- NEW -->
<button class="btn btn-primary">Submit</button>
<button class="btn btn-secondary">Cancel</button>
<button class="btn btn-danger btn-sm">Delete</button>
<button class="btn btn-icon btn-tertiary">Copy</button>
<button class="btn btn-primary btn-sm">View</button>
```

## Questions?

Refer to:
- `BUTTON_AUDIT_SUMMARY.md` - Full implementation details
- `BUTTON_STANDARDIZATION.md` - Migration tracking
- `styles.css` - Button system source code
