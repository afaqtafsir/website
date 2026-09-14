---
name: astro-whitespace-and-layout
description: Handling JSX whitespace rules, HTML minification, and component spacing in Astro v7+. Use when building UI components, metadata bars, prose layouts, or debugging missing spaces and collapsed inline elements.
---

# Astro JSX Whitespace & Component Layout

In Astro v7.0+, Astro applies JSX whitespace rules by default (`compressHTML: "jsx"`). This aligns Astro's template compilation with React, Preact, and Solid, but it introduces layout pitfalls when mixing multi-line HTML tags with inline elements.

---

## 1. The Core Mechanic: `compressHTML: 'jsx'`

When templates are compiled:
* **Whitespace and line breaks between tags on separate lines are stripped.**
* **Whitespace within a single line is preserved.**
* **Multi-line text is collapsed onto a single line.**

### The Gotcha
```astro
<!-- Source: formatting tags on separate lines -->
<div class="card-meta">
  <time>{formatDate(date)}</time>
  <span class="sep">•</span>
  <span>{readingTime}</span>
</div>

<!-- Compiles to: -->
<div class="card-meta"><time>14 Sep 2026</time><span class="sep">•</span><span>5 mnt</span></div>

<!-- Renders in browser as: -->
14 Sep 2026•5 mnt
```

If the parent container is a standard block or inline flow container, adjacent tags touch without spaces.

---

## 2. Architectural Rule: Prose vs. UI Components

Do not treat this solely as a whitespace bug. The solution depends on whether you are working with **grammatical sentences (prose)** or **structured UI elements (components)**.

### A. Use `{" "}` ONLY in Inline Prose / Running Text
When elements form a continuous grammatical sentence or paragraph, use explicit JSX string literals `{" "}`:

```astro
<!-- ✅ CORRECT: Preserves grammatical word spacing in running text -->
<p>
  Silakan baca panduan pengiriman naskah di <a href="/panduan">halaman ini</a>{" "}
  sebelum mengirimkan karya tulis Anda.
</p>
```

**Why:** Flexbox would break natural paragraph line wrapping. An explicit space represents a true linguistic word separator (`U+0020`).

---

### B. Use Flexbox `gap` for UI Components (Metadata, Chips, Badges)
For metadata strips, breadcrumbs, action bars, tags, and card headers, **never rely on `{" "}` or HTML whitespace**. Always make the container a Flexbox element with an explicit `gap`:

```astro
<!-- Template -->
<div class="card-meta">
  <time>{formatDate(date)}</time>
  <span class="meta-sep">•</span>
  <span>{readingTime}</span>
</div>

<style>
  /* ✅ CORRECT: Deterministic spacing, perfect vertical alignment */
  .card-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px; /* Controlled via design tokens */
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .meta-sep {
    opacity: 0.5;
    /* Do NOT add horizontal margin to .meta-sep here; 
       let flex gap manage all inter-item spacing. */
  }
</style>
```

---

## 3. Why Flexbox `gap` Beats `{" "}` in Components

| Problem with `{" "}` in Components | How Flexbox `gap` Fixes It |
| :--- | :--- |
| **Variable Width**: The width of `U+0020` varies with font family, weight, and letter-spacing. | **Pixel-Precise**: `gap: 6px` is deterministic and tokenized. |
| **Baseline Drift**: Emojis (`⏱`, `🔥`) and bullet characters (`•`) sit 1–2px off-baseline from text. | **Vertical Centering**: `align-items: center` ensures uniform alignment. |
| **Awkward Wrapping**: Separator dots can be orphaned at the start of wrapped lines (`• 5 mnt`). | **Controlled Flow**: Flex items wrap predictably as bounded units. |
| **High Regression Risk**: Developers or linters reformatting code across lines will silently drop `{" "}`. | **Encapsulated**: The CSS guarantees correct layout regardless of HTML indentation. |

---

## 4. Nested Inline Wrappers (e.g. Byline Prefixes)

If a metadata bar contains a labeled entity (e.g., `"Ditulis oleh [Author Name]"`):

```astro
<div class="article-byline-bar">
  <div class="byline-author">
    <span class="byline-prefix">Ditulis oleh</span>
    <a href={author.url} class="byline-link">{author.name}</a>
  </div>
  <span class="byline-dot">•</span>
  <time>{date}</time>
</div>
```

Ensure the inner wrapper `.byline-author` is also flex-aware:

```css
.article-byline-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px; /* Spacing between major metadata chunks */
}

.byline-author {
  display: inline-flex;
  align-items: center;
  gap: 5px; /* Natural word spacing between prefix and name */
}
```

---

## 5. Summary Checklist

- [ ] Is it a continuous sentence in a paragraph? 👉 Use `{" "}`.
- [ ] Is it a metadata strip, tag list, or badge row? 👉 Use `display: flex; align-items: center; gap: <size>;`.
- [ ] Does a separator element (`.meta-sep`) have `margin`? 👉 Remove it if inside a flex container to prevent double-spacing with `gap`.
- [ ] Are items properly vertically aligned? 👉 Use `align-items: center` on the flex container.
