# Product Requirement Document (PRD)
## Project: Afaq Tafsir (afaqtafsir.id)
**Document Version:** 1.1  
**Target Platform:** Web (Desktop & Mobile Responsive)  
**Tech Stack:** Astro v7 (SSR/SSG Edge-Ready), Cloudflare Workers / Pages, Cloudflare Emdash CMS (v0.35), Cloudflare R2, Cloudflare D1  
**Author / Engineering Lead:** Farhan & Tim Redaksi Afaq Tafsir  

---

## 1. Executive Summary & Product Vision

### 1.1 Mission & Value Proposition
**Afaq Tafsir** is a curated, high-authority digital publishing platform dedicated to Quranic exegesis (*Tafsir*), Islamic studies, and contemporary socio-religious discourse. The platform bridges rigorous academic scholarship with accessible, modern public intellectual discourse.

Initiated in 2026 by scholars from **Pendidikan Kader Ulama Masjid Istiqlal (PKUMI) — Program Kader Ulama Perempuan**, Afaq Tafsir provides a dignified intellectual space for research, contextual exegesis, and academic collaboration.

### 1.2 Business & Publishing Model
1. **Phase 1 (Launch & Authority Building):** Internal publishing by the founding editorial board and close collaborators to establish brand authority and define rigorous editorial standards. Contributor submissions are handled via an informal email placeholder flow.
2. **Phase 2 (Growth & Contributor Network):** An open submission portal where external scholars, researchers, and writers submit manuscripts through a contributor dashboard for peer editorial review.

### 1.3 Target Audience
* Academic researchers, Islamic studies university students, pesantren scholars, and Muslim intellectuals.
* General readers seeking nuanced, contextual, and textually grounded interpretations of the Quran.

---

## 2. Technical Architecture & Infrastructure

| Layer | Technology | Purpose / Configuration |
| :--- | :--- | :--- |
| **Frontend Framework** | Astro v7 | Ultra-fast static & server-side rendering (SSR), zero JS by default, component-island architecture. |
| **Compute / Edge** | Cloudflare Workers / Pages | Server-side rendering, routing, and edge execution with ultra-low global latency. |
| **CMS Engine** | Cloudflare Emdash v0.33 | Headless editorial backend for article CRUD, preview, scheduling, and metadata management. |
| **Database** | Cloudflare D1 (Serverless SQLite) | Relational storage for articles, authors, taxonomy, and system configurations. |
| **Media / Video Storage** | Cloudflare R2 | Zero-egress object storage for article graphics, assets, and self-hosted native MP4 videos. |
| **Media Delivery** | Custom Domain on R2 (`assets.afaqtafsir.id`) | Automatic HTTP 206 Partial Content (Range Request) streaming for video/audio. |
| **Styling & Tokens** | Pure Vanilla CSS / CSS Variables | Centralized design tokens in `tokens.css` without heavy CSS frameworks for maximum performance. |

---

## 3. Phasing Strategy (Build Once, Scale Seamlessly)

The system is designed so that **frontend components built in Phase 1 require zero visual redesign when transitioning to Phase 2**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Launch & Editorial Authority (Current Scope)                       │
│ • Single-Tier Sticky Navbar (Brand + Beranda + Tentang + Kontak + 🔍 + CTA) │
│ • Curated Homepage (Hero Bento 5-Card + Video Box + Pattern A + Pattern B) │
│ • Contributor submission guideline placeholder (informal email flow)        │
│ • Rich Article Reading View (Arabic typography, Footnotes, Author Card)     │
│ • Manifesto & Code of Ethics page with Editorial Directory                  │
│ • Manual author profile attribution via CMS (No author login required)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Seamless Upgrade (No Redesign)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Open Submissions & Contributor Portal                              │
│ • Navbar adds "Kategori ▾" dropdown (Once taxonomy is established)          │
│ • Homepage blocks query specific categories instead of generic feeds        │
│ • Contributor Dashboard: External writers register, draft, and track status │
│ • Advanced multi-faceted archive search                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Design System & Visual Specification

The visual identity is a hybrid combining the **modern whitespace, sleek cards, and typography of Nalar Tafsir** with the **intellectual density and authoritative structure of Ibihtafsir**, skinned in **Afaq Tafsir’s Celestial Sky Blue, Deep Navy, and Sunrise Amber palette**.

### 4.1 Master Design Tokens (`tokens.css`)

```css
:root {
  /* --- Primitive Color Palette --- */
  /* Afaq Sky Blue Color Palette (Primary Brand Palette) */
  --sky-500: #34c6f4; /* Primary Vibrant Sky Blue */
  --sky-400: #55caf0; /* Bright Sky Blue */
  --sky-300: #7ed2ef; /* Mid Light Sky Blue */
  --sky-200: #a7dff3; /* Soft Sky Blue */
  --sky-100: #d6eff8; /* Lightest Sky Blue Tint */
  --sky-50:  #f0f8fd; /* Global Soft Sky Background */

  /* Deep Celestial Navy (High-Legibility Text & Dark Contrast Elements) */
  --blue-950: #081a2f; /* Deep Midnight Navy (Headings, Navbar, Footer) */
  --blue-900: #0e2746; /* Deep Celestial Navy (Hero gradients, Container backdrops) */
  --blue-800: #143861; /* Interactive Navy Hover */
  --blue-700: #1c4b7f; /* Secondary Navy Accent */
  --blue-600: #2563a6; /* Brand Navy Blue */
  --blue-500: #34c6f4; /* Brand Sky Blue */

  /* Sunrise Amber / Gold Accent */
  --gold-600: #b45309; /* Dark Amber (Active CTA Hover) */
  --gold-500: #d97706; /* Sunrise Amber / Secondary Accent (Primary CTA, Badges, Underline Bars) */
  --gold-400: #f59e0b; /* Bright Amber */
  --gold-100: #fef3c7; /* Amber Badge Background */
  --gold-50:  #fffbeb; /* Light Gold Tint */

  --white:       #ffffff;
  --slate-900:   #0f172a;
  --slate-800:   #1e293b; /* High-Legibility Body Text */
  --slate-700:   #334155;
  --slate-600:   #475569; /* Muted Metadata / Byline Text */
  --slate-400:   #94a3b8; /* Placeholder Text */
  --slate-300:   #cbd5e1;
  --slate-200:   #e2e8f0; /* Default Divider Lines */
  --slate-100:   #f1f5f9;

  /* --- Semantic Tokens --- */
  --brand-primary:       var(--sky-500);       /* Light Sky Blue Brand */
  --brand-primary-hover: var(--sky-400);
  --brand-navy:          var(--blue-900);
  --brand-accent:        var(--gold-500);
  --brand-accent-hover:  var(--gold-600);

  --bg-body:             var(--sky-50);
  --bg-surface:          var(--white);
  --bg-surface-subtle:   var(--sky-100);
  --bg-dark-section:     linear-gradient(180deg, var(--blue-900) 0%, var(--blue-950) 100%);
  --bg-sky-gradient:     linear-gradient(135deg, var(--sky-100) 0%, var(--sky-200) 50%, var(--sky-300) 100%);

  --text-heading:        var(--blue-950);
  --text-body:           var(--slate-800);
  --text-muted:          var(--slate-600);
  --text-inverse:        var(--white);
  --text-brand:          #0b688c; /* Accessible Sky/Navy for light backgrounds */
  --text-accent:         var(--gold-500);

  --border-subtle:       var(--slate-200);
  --border-brand:        var(--sky-200);
  --border-brand-strong: var(--sky-300);
  --border-accent:       var(--gold-500);

  /* --- Typography --- */
  --font-serif:  'Lora', Georgia, 'Times New Roman', serif;
  --font-sans:   'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-arabic: 'Amiri', 'Traditional Arabic', 'Scheherazade New', serif;

  --text-xs:   0.75rem;    /* 12px */
  --text-sm:   0.875rem;   /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg:   1.125rem;   /* 18px */
  --text-xl:   1.25rem;    /* 20px */
  --text-2xl:  1.5rem;     /* 24px */
  --text-3xl:  1.875rem;   /* 30px */
  --text-4xl:  2.25rem;    /* 36px */

  --leading-tight:  1.25;
  --leading-normal: 1.6;
  --leading-loose:  1.85;

  /* --- Elevation & Geometry --- */
  --radius-sm:   6px;
  --radius-md:   12px;
  --radius-lg:   20px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 3px rgba(14, 39, 70, 0.05);
  --shadow-md: 0 6px 18px -3px rgba(14, 39, 70, 0.08), 0 2px 6px -1px rgba(14, 39, 70, 0.03);
  --shadow-lg: 0 16px 32px -4px rgba(14, 39, 70, 0.12), 0 6px 12px -2px rgba(14, 39, 70, 0.05);

  --container-max:     1240px;
  --transition-fast:   0.2s cubic-bezier(0.16, 1, 0.3, 1);
  --transition-smooth: 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
```

### 4.2 Core Visual Rules
1. **Headline Treatment:** All primary and section headlines MUST use `--font-serif` with color `--text-heading`.
2. **The "Amber Sunrise Bar":** Section headers feature a warm accent underline bar (`height: 3px; width: 48px; background: var(--brand-accent); border-radius: var(--radius-full);`).
3. **Card Styling:** Clean white backgrounds (`--bg-surface`), rounded corners (`--radius-md`), 1px subtle sky border (`--border-brand`), and soft navy drop shadow (`--shadow-sm`).
4. **Active Navigation Indicator:** Active navbar links display a modern Sky Blue gradient underline bar (`linear-gradient(90deg, var(--sky-500) 0%, var(--sky-300) 100%)`).
5. **Thumbnail Fallback Rule:** If an article lacks an image, use an elegant typographic cover template (Deep Navy background + Serif Category Label) rather than a blank box.

---

## 5. Navigation & Information Architecture

### 5.1 Main Header (Single-Tier Layout)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ [ AFAQ TAFSIR LOGO ]      Beranda      Tentang      Kontak      [ 🔍 ]   [+ Kirim Tulisan] │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

* **Logo:** Left-aligned SVG emblem (Quran book icon with sky gradient) + Brand title ("Afaq Tafsir") & subtitle ("JURNAL & PEMIKIRAN QUR'ANI"). Clicking routes to `/` (Homepage).
* **Navigation Links (`--font-sans`, 14px, font-weight: 600):**
  * `Beranda` (`/`) — Active indicator is a Sky Blue gradient underline bar.
  * `Tentang` (`/tentang`) — Manifesto, PKUMI initiator profile, Code of Ethics, and Editorial directory.
  * `Kontak` (`/kontak`) — Official inquiries, email directory, and social media channels.
* **Search Trigger `[ 🔍 ]`:** Opens an accessible client-side modal search dialog with live keyword filtering across titles, authors, and categories. Keyboard shortcuts: `Ctrl+K` / `Cmd+K` to open, `Escape` to close.
* **Primary Action CTA (`[+ Kirim Tulisan]`):** Sunrise Amber button with pen icon linking to `/kirim-tulisan`.
* **Mobile Responsiveness:** Features a mobile drawer toggle displaying all navigation links and the CTA button on smaller screens (<768px).
* **Sticky Behavior:** `position: sticky; top: 0; z-index: 900; background: var(--white); border-bottom: 1px solid var(--border-subtle);`.

*(Note for Phase 2: A dropdown labeled `Kategori ▾` will be inserted between `Beranda` and `Tentang` once taxonomy is fully populated).*

---

## 6. Page Specifications & Layout Wireframes

### 6.1 Homepage (`/`)

The homepage uses a balanced magazine layout: **Main Feed (~70% width)** on the left and **Sidebar (~30% width / 340px)** on the right.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ NAVBAR (Sticky)                                                                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│ ┌──────────────────────────────────────┬─────────────────────────────────────────────┐ │
│ │ HERO LEAD (Left ~57%)                │ SECONDARY HERO STACK (Right ~43%)           │ │
│ │ • Large 16:9 Cover Image             │ ┌─────────────────────────────────────────┐ │ │
│ │ • Sky/Gold Category Badge            │ │ Secondary Card #1 (120x120 Thumbnail)   │ │ │
│ │ • 1.65rem Bold Serif Title           │ ├─────────────────────────────────────────┤ │ │
│ │ • Excerpt (2-3 lines)                │ │ Secondary Card #2 (120x120 Thumbnail)   │ │ │
│ │ • Author • Date • Read Time          │ ├─────────────────────────────────────────┤ │ │
│ │                                      │ │ Secondary Card #3 (120x120 Thumbnail)   │ │ │
│ │                                      │ ├─────────────────────────────────────────┤ │ │
│ │                                      │ │ Secondary Card #4 (120x120 Thumbnail)   │ │ │
│ └──────────────────────────────────────┴─────────────────────────────────────────────┘ │
│                                                                                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 🎬 KAJIAN VISUAL & MULTIMEDIA (Modular Cloudflare R2 Video Box - Navy Gradient)        │
│ ┌──────────────────────────────────────┬─────────────────────────────────────────────┐ │
│ │ [ 16:9 Native HTML5 Player from R2 ] │ • Badge: "KAJIAN PILIHAN" (Gold)            │ │
│ │ • Pill: "Cloudflare R2 Stream"       │ • Judul Video & Tema Kosmologi (Serif)      │ │
│ │ • Poster Image + Video Controls      │ • Pembicara (Dr. Hamdan Syukri & Redaksi)   │ │
│ │                                      │ • Sinopsis Kajian Multidisipliner           │ │
│ └──────────────────────────────────────┴─────────────────────────────────────────────┘ │
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│ MAIN CONTENT FEED (Left ~70%)          │ SIDEBAR (Right ~30% / 340px)                  │
│ ─────────────────────────────          │ ────────────────────────────                  │
│                                        │                                               │
│ 🌟 1. ARTIKEL PILIHAN (Pattern A)      │ 📌 WIDGET 1: TENTANG AFAQ TAFSIR              │
│ ┌──────────────────┬─────────────────┐ │ ┌───────────────────────────────────────────┐ │
│ │ 1 Large Lead     │ 4 Stacked Mini  │ │ │ Visi singkat + [ Baca Manifesto & Visi →] │ │
│ │ (50% Width)      │ Items (50%)     │ │ └───────────────────────────────────────────┘ │
│ └──────────────────┴─────────────────┘ │                                               │
│                                        │ 🔥 WIDGET 2: ARTIKEL TERBANYAK DIBACA         │
│ 📰 2. ARTIKEL TERBARU (Pattern B)      │ ┌───────────────────────────────────────────┐ │
│ ┌──────────────────┬─────────────────┐ │ │ 01. Judul Artikel (Ranked #1 to #5 + Views)│ │
│ │ Medium Lead 1    │ Medium Lead 2   │ │ │ 02. Judul Artikel                         │ │
│ ├──────────────────┼─────────────────┤ │ └───────────────────────────────────────────┘ │
│ │ Mini Item 1      │ Mini Item 2     │ │                                               │
│ ├──────────────────┼─────────────────┤ │ 💰 WIDGET 3: CTA KONTRIBUTOR                │
│ │ Mini Item 3      │ Mini Item 4     │ │ ┌───────────────────────────────────────────┐ │
│ └──────────────────┴─────────────────┘ │ │ Badge: PANGGILAN KONTRIBUTOR              │ │
│                                        │ │ "Kirimkan Naskah Esai Anda..."            │ │
│ [ Tombol: Muat Lebih Banyak Artikel ]  │ │ [ Panduan Pengiriman Naskah → ]           │ │
│                                        │ └───────────────────────────────────────────┘ │
├────────────────────────────────────────┴───────────────────────────────────────────────┤
│ FOOTER (Deep Celestial Navy Gradient)                                                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Section Details:

1. **Hero Section (Bento 5-Card Grid):**
   * **Left (~57%):** Major weekly curated lead story. Displays high-resolution 16:9 cover image, category badge, 1.65rem Serif title, 2-line excerpt, author byline, publication date, and estimated reading time (*e.g., "6 mnt baca"*).
   * **Right (~43%):** 4 stacked secondary editorial picks. Compact horizontal card format with 120x120px square thumbnail, category badge, 1.02rem Serif title, author, and reading time.

2. **Modular Video Showcase (Cloudflare R2 Direct Stream):**
   * **Configuration:** Toggleable via `siteConfig.videoShowcase.enabled` (or CMS setting). Renders only when enabled.
   * **Container:** Deep Celestial Navy gradient box (`--bg-dark-section`) with 20px radius, subtle border glow, and white typography.
   * **Video Player Specs:**
     * Features Cloudflare R2 Stream badge pill overlay.
     * Streams MP4 direct content with `controls`, `playsinline`, `preload="metadata"`, and high-resolution `poster` thumbnail.
   * **Right Side:** Gold badge `"KAJIAN PILIHAN"`, Serif video title, speaker byline (with microphone icon), and descriptive synopsis.

3. **Main Feed Block 1: "Artikel Pilihan" (Layout Pattern A):**
   * Header: `Artikel Pilihan` with the Sunrise Amber underline bar.
   * Left Column (50%): 1 Large Lead Card with 16:10 thumbnail, category badge, 1.25rem title, excerpt, and author/date metadata.
   * Right Column (50%): 4 vertical stacked mini-items (78x78px thumbnail on the left, 2-line title on the right, category badge, date).

4. **Main Feed Block 2: "Artikel Terbaru" (Layout Pattern B):**
   * Header: `Artikel Terbaru` with the Sunrise Amber underline bar.
   * Top Half: 2 Medium featured cards side-by-side (16:9 thumbnail, category badge, 1.1rem title, excerpt, author, date).
   * Bottom Half: 2x2 subgrid of 4 compact list items (60x60px thumbnail + 2-line title + date).
   * Bottom Action: Primary outline button `"Muat Lebih Banyak Artikel"`.

5. **Sidebar Widgets (Right ~30% / 340px):**
   * **Widget 1 (Tentang Afaq Tafsir):** Mission summary with link `Baca Manifesto & Visi Kami →` pointing to `/tentang`.
   * **Widget 2 (Artikel Terbanyak Dibaca):** Numbered popular list ranked #1 to #5 with prominent Amber digits (`01`–`05`), clickable titles, and readership statistics (*e.g., "14.2k dibaca"*).
   * **Widget 3 (CTA Kontributor):** Gold-bordered card with `PANGGILAN KONTRIBUTOR` badge: *"Redaksi Afaq Tafsir membuka penerimaan artikel tematik tafsir dan pemikiran Islam."* Includes full-width CTA button `Panduan Pengiriman Naskah →` linking to `/kirim-tulisan`.

---

### 6.2 Article Detail Page (`/artikel/[slug]`)

A reading experience optimized for intellectual contemplation, distraction-free longform reading, and Quranic typography support.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Beranda  ›  TAFSIR TEMATIK  ›  Judul Artikel               │
│                                                                        │
│ [CATEGORY BADGE: e.g. TAFSIR TEMATIK]                                  │
│ HEADLINE: Benarkah Hawa Penyebab Manusia Turun dari Surga? (Serif 36px)│
│ Subheadline: Meninjau Ulang Narasi Penciptaan dalam Literatur Tafsir   │
│                                                                        │
│ Ditulis oleh Mochamad Refian Prasetyo  •  18 Agustus 2026  •  ⏱ 6 mnt  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ [ FEATURED IMAGE / BANNER (16:9 Ratio, Rounded Corners, Sky Border) ]  │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ ARTICLE PROSE CONTAINER (Max-Width: 720px, Centered)               │ │
│ │                                                                    │ │
│ │ Lead paragraph (20px, font-weight 500, deep navy)...               │ │
│ │                                                                    │ │
│ │ ┌────────────────────────────────────────────────────────────────┐ │ │
│ │ │ AYAT / ARABIC QUOTE BOX                                        │ │ │
│ │ │ فَوَسْوَسَ لَهُمَا الشَّيْطَانُ... (Amiri 26px, RTL, Arabic)   │ │ │
│ │ │ "...lalu setan membisikkan pikiran jahat kepada keduanya..."   │ │ │
│ │ │ ۞ — QS. AL-A'RAF [7]: 20                                       │ │ │
│ │ └────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                    │ │
│ │ Standard paragraph text with font size 18px, line height 1.85...   │ │
│ │ Interactive Footnotes format [1] integrated seamlessly...          │ │
│ │                                                                    │ │
│ │ ────────────────────────────────────────────────────────────────── │ │
│ │ CATATAN KAKI & RUJUKAN                                             │ │
│ │ [1] Ibnu Katsir, Tafsir Al-Qur'an Al-'Azhim, Jilid 3, hlm. 142.     │ │
│ │ [2] Muhammad Asad, The Message of the Qur'an, penjelasan QS 20:120 │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ AUTHOR PROFILE CARD                                                    │
│ ┌────────┬───────────────────────────────────────────────────────────┐ │
│ │ [Foto] │ PROFIL PENULIS                                            │ │
│ │        │ Mochamad Refian Prasetyo                                  │ │
│ │        │ Fakultas Ushuluddin & Peneliti Independen                 │ │
│ │        │ Peneliti studi Al-Qur'an dan hermeneutika kontemporer...  │ │
│ │        │ [Lihat Profil & Arsip Penulis →]                          │ │
│ └────────┴───────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ KAJIAN TERKAIT (3-Card Horizontal Grid)                                │
├────────────────────────────────────────────────────────────────────────┤
│ RUANG DISKUSI ILMIAH (Termoderasi)                                     │
└────────────────────────────────────────────────────────────────────────┘
```

#### Key Technical Requirements for Article Detail:
* **Arabic Typography & Ayat Rendering:** Quranic verses use `--font-arabic` (Amiri), `font-size: 1.65rem`, `line-height: 2.3`, `direction: rtl`, with ornamental reference formatting (`۞ — QS. ...`).
* **Interactive Footnotes:** Footnotes render as clickable superscripts (`[1]`, `[2]`) that trigger smooth scrolling to the footnote item and highlight it temporarily with a gold background.
* **Author Card Attribution:** Displays author photo, role/affiliation, biography, and anchor link pointing to the author's card in `/tentang#author-[slug]`.
* **Related Articles:** 3-card grid showcasing related exegesis pieces.
* **Moderated Discussion Box:** Scientific discussion prompt with a moderation badge and toast feedback.

---

### 6.3 "Laman Kirim Tulisan" (Contributor Submission Placeholder) (`/kirim-tulisan`)

An informational landing page providing preliminary guidelines and email submission instructions for interested contributors.

> [!NOTE]
> Detailed honorarium structures, formal peer-review SLAs, and automated contributor portals are currently unformalized placeholders and will be finalized prior to Phase 2.

#### Page Content & Sections (Placeholder Scope):
1. **Header & Manifesto:**
   * Badge: `PANDUAN KONTRIBUTOR & PENULIS`
   * Headline: *Syarat dan Ketentuan Pengiriman Naskah*
   * Subheadline: *Afaq Tafsir membuka ruang bagi akademisi, peneliti, santri, dan pemikir keislaman untuk mempublikasikan kajian Al-Qur'an dan tafsir.*
2. **Draft Submission Guidelines:**
   * **General Structure:** Essay format (~800–1.000 words), readable digital paragraphs.
   * **Scope & Topic:** Quranic exegesis (thematic tafsir), hermeneutics, manuscript studies, and contextual discourse.
   * **Style & Reference:** Academic-popular tone, standard transliteration, and author attribution info.
3. **Instruksi Pengiriman Surel:**
   * **Surel Tujuan:** `afaqtafsir.id@gmail.com` / `redaksi@afaqtafsir.id`
   * **Format Subjek:** `Tema_Nama Penulis_Judul Tulisan`
   * **Template Naskah & Bio:** Includes quick-copy format button (*"Salin Format Pengiriman"*) and direct mailto launcher (*"Buka Aplikasi Email"*).

---

### 6.4 Static Pages: "Tentang Kami" & "Kontak"

#### `Tentang Kami` (`/tentang`)
* **Profil & Manifesto Platform:** Diinisiasi pada tahun 2026 oleh mahasiswi **Pendidikan Kader Ulama Masjid Istiqlal (PKUMI) — Program Kader Ulama Perempuan**.
* **Kode Etik {siteConfig.name}:**
  1. *Integritas Akademik & Orisinalitas:* Bebas plagiasi, rujukan ilmiah akurat dan dapat dipertanggungjawabkan.
  2. *Kebebasan Berpendapat yang Bertanggung Jawab:* Santun, argumentatif, objektif, tanpa diskriminasi atau ujaran kebencian.
* **Inisiator & Dewan Redaksi:**
  * *Inisiator:* Kader Ulama Perempuan PKUMI.
  * *Dewan Redaksi & Kurasi:* Bertanggung jawab atas penyuntingan, kurasi substansi, dan standarisasi publikasi.
* **Direktori Penulis & Redaksi:** Profil terperinci (nama, foto, jabatan, afiliasi, bio) untuk Arofah Nur (Pimred), Dr. Hamdan Syukri (Dewan Pakar), Mochamad Refian Prasetyo, Fikri Anshari, Muhammad Iqbal, Nurul Izzah, dkk.
* **CTA Kontributor Banner:** Banner ajakan menulis dengan tautan ke `/kirim-tulisan`.

#### `Kontak` (`/kontak`)
* **Saluran Surel Resmi:**
  * *Surel Editorial & Submisi:* `afaqtafsir.id@gmail.com` (pengiriman naskah, koreksi editorial, hak cipta).
  * *Kerjasama & Kemitraan:* `afaqtafsir.id@gmail.com` (kolaborasi riset, seminar, bedah buku, publikasi bersama).
* **Media Sosial Resmi:**
  * Instagram: `@afaqtafsir`
  * YouTube: `@afaqtafsir`
  * TikTok: `@afaqtafsir`
  * X (Twitter): `@afaqtafsir`

---

### 6.5 Global Footer

* **Styling:** Deep Celestial Navy gradient (`--bg-dark-section`), light sky blue text (`--sky-200`), and subtle gold accents.
* **Column 1 (Brand & Slogan):** Emblem logo, site title, slogan *"Membaca Al-Qur'an, Melihat Lebih Luas"*, and circular social channel icon buttons.
* **Column 2 (Navigasi Utama):** Links to `Beranda Utama`, `Kajian Pilihan Terkini`, `Pedoman Kirim Naskah`, `Tentang Redaksi & Visi`.
* **Column 3 (Editorial & Kontak):** Contact email highlight, `Hubungi Kerjasama →`, and `Dewan Redaksi & Kebijakan`.
* **Bottom Bar:** `© [Tahun Berjalan] Afaq Tafsir. Dikelola secara independen.`

---

## 7. User Roles & Permission Matrix

| Role | Account Required | Frontend Capabilities | CMS / Backend Capabilities |
| :--- | :---: | :--- | :--- |
| **Reader (Pembaca)** | No | Read public articles, search, view author profiles, explore footnotes. | None. |
| **Guest Author (Phase 1)** | No | Reads submission guidelines, copies email format, submits manuscripts via email. | None (Admin manually attributes author bio). |
| **Contributor (Phase 2)** | Yes | Submits drafts via contributor dashboard, tracks review and payment status. | Limited Contributor Portal view. |
| **Editor (Arofah dkk)** | Yes | Preview drafts, full reading access. | Create, edit, approve, reject, schedule, and publish articles; manage authors. |
| **Admin (Farhan)** | Yes | Full platform access. | Full system configuration, user/role management, CMS schema, R2 video config. |

---

## 8. Emdash CMS Content Model & Collection Specifications

All structured content is managed natively via **Cloudflare Emdash CMS** backed by D1, eliminating manual SQL schema migrations. Content types are modeled as type-safe collections and taxonomies.

### 8.1 Collection: `articles` (Primary Content Collection)
* `title` (Text, Required, Searchable) — *Judul Artikel*
* `slug` (Slug, Required, Unique) — URL-friendly slug
* `subheadline` (Text, Optional) — Secondary italic subheadline
* `excerpt` (Textarea, Required, Searchable) — 2-sentence summary for cards and OpenGraph metadata
* `content` (RichText / Markdown / Portable Text, Required) — Primary article body
* `featured_image` (Media Asset / Image, Optional) — Cover image stored in R2 Media Library
* `author` (Relation -> `authors`, Required) — Assigned author profile
* `category` (Taxonomy -> `categories`, Hierarchical) — Assigned exegesis topic/category
* `reading_time` (Text / Number, Optional) — Estimated reading duration (*e.g., "6 mnt baca"*)
* `is_lead_hero` (Boolean, Default: `false`) — Flags story as primary Hero Bento lead (~57% width)
* `is_secondary_hero` (Boolean, Default: `false`) — Places story in the right Hero Bento stack
* `is_featured` (Boolean, Default: `false`) — Toggles inclusion in curated Pattern A / B homepage feeds
* `is_popular` (Boolean, Default: `false`) — Toggles presence in sidebar top reads
* `popular_rank` (Number, 1–5, Optional) — Explicit ranking for popular widget
* `popular_reads` (Text, Optional) — Readership metric display (*e.g., "14.2k dibaca"*)
* `status` (Enum: `'draft'`, `'in_review'`, `'published'`, `'scheduled'`, `'archived'`)
* `published_at` (Datetime, Optional) — Publication timestamp for scheduling and ordering

#### Custom Content Components (Rich Body Extensions):
* **`AyatQuote` Block:** Arabic verse (Amiri font, RTL direction), Indonesian translation, and Surah verse reference (`۞ — QS. ...`).
* **`Footnotes` Block:** Numbered academic citations rendering as interactive clickable anchor targets.

### 8.2 Collection: `authors` (Directory Collection)
* `name` (Text, Required, Searchable) — Full name and academic titles (*e.g., "Dr. Hamdan Syukri, M.Ud."*)
* `slug` (Slug, Required, Unique) — Author profile slug
* `role` (Text, Optional) — Editorial role (*e.g., "Pemimpin Redaksi"*, *"Dewan Pakar"*, *"Kontributor"*)
* `avatar` (Media Asset / Image, Optional) — Author photo from R2 Media Library
* `bio` (Textarea, Required) — Biographical narrative (50–100 words)
* `affiliation` (Text, Optional) — Academic or institutional affiliation (*e.g., "Fakultas Ushuluddin & Peneliti Independen"*)
* `email` (Email, Optional) — Correspondence email

### 8.3 Taxonomy: `categories` (Hierarchical Classification)
Managed through Emdash Taxonomies to categorize exegesis topics:
* `TAFSIR TEMATIK`, `KOSMOLOGI QUR'ANI`, `STUDI NASKAH`, `FILSAFAT ISLAM`, `BALAGHAH`, `MANUSKRIP`, `SOSIO-HISTORIS`, `RESENSI BUKU`, `HERMENEUTIKA`, `SIYASAH`, `TASAWUF`, `GENDER & ISLAM`, `FILOLOGI`.

### 8.4 Site Settings & Menu Management
Configured via Emdash Site Settings and Visual Menu Builder:
* `site_name`: `"Afaq Tafsir"`
* `site_tagline`: `"Membaca Al-Qur'an, Melihat Lebih Luas"`
* `subtagline`: `"Jurnal & Pemikiran Qur'ani"`
* `video_showcase` (Settings Object):
  * `enabled`: `true` / `false`
  * `badge`: `"KAJIAN PILIHAN"`
  * `title`: Video title string
  * `speaker`: Speaker and presenter credits
  * `video_url`: R2 direct MP4 streaming URL
  * `poster_url`: R2 thumbnail cover image
* `menus`: Managed via Emdash Menu Builder (`primary-nav`, `footer-nav`, `footer-editorial`).

---

## 9. Frontend Querying & Search Architecture

### 9.1 Astro Data Layer Integration (`emdash`)
Content is queried directly in Astro templates using Emdash's type-safe query helpers following the Live Content Collections pattern:

```astro
---
import { getEmDashCollection, getEmDashEntry } from "emdash";

// Retrieve articles collection
const { entries: articles, error } = await getEmDashCollection("articles");

// Retrieve single article by slug for dynamic route [slug].astro
const { entry: article, isPreview } = await getEmDashEntry("articles", Astro.params.slug);
---
```

### 9.2 Search Implementation (Phase 1 Scope)
* **UI:** Accessible modal dialog triggered by the `[ 🔍 ]` icon in the header or keyboard shortcut `Ctrl+K` / `Cmd+K`.
* **Mechanism:**
  * Client-side fast filtering across cached article collection fields (`title`, `author`, `category`, `excerpt`) for sub-10ms response times.
  * In production, connects seamlessly with Emdash Search / Cloudflare AI Search index across searchable collection fields.
* **UX:** Live search results displaying category badge, serif title, author name, and date with instant keyboard navigation (`Esc` to dismiss).

---

## 10. Acceptance Criteria & Launch Checklist

Before deploying to the public production domain `afaqtafsir.id`:

- [x] **Design Token Verification:** All page elements use CSS variables defined in `tokens.css`.
- [x] **Responsive Design Test:** Flawless layout on Mobile (375px–430px), Tablet (768px–1024px), and Desktop (1280px–1920px).
- [x] **Hero Bento 5-Card Grid:** Renders 1 Lead Curated Article + 4 Secondary Hero Cards cleanly without overflow.
- [x] **Zero Category Dependency:** Homepage and card fallbacks render gracefully even if an article lacks an image or formal category.
- [x] **R2 Video Showcase:** Toggle correctly hides/shows the section; native player controls and Cloudflare R2 Stream badge work smoothly.
- [x] **Typography & Quranic Arabic Rendering:** Quranic verses render cleanly in Amiri font with proper right-to-left (RTL) alignment and ornamental reference markers.
- [x] **Footnotes Interaction:** Footnotes expand and smooth-scroll to citation list with momentary highlight on click.
- [x] **Submission Page (`/kirim-tulisan`):** Renders submission guideline placeholder with email submission instructions.
- [x] **Manifesto & Ethics Page (`/tentang`):** Highlights PKUMI initiator history, Code of Ethics, and author directory.
- [x] **Search Modal:** `[ 🔍 ]` and `Ctrl+K` trigger smoothly and return live matched results.
- [x] **SEO & Metadata:** OpenGraph tags (title, description, cover image) and semantic metadata configured for social sharing previews.