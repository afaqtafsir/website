# Seed Generation & Content Plan: Afaq Tafsir (afaqtafsir.id)
**Document Version:** 1.0  
**Target File:** `seed/seed.json`  
**Framework:** EmDash CMS v0.35 + Astro v7  

---

## 1. Executive Overview & Objectives

This document establishes the architecture, schema definitions, and content matrix for generating the official EmDash CMS seed file (`seed/seed.json`). 

### Core Objectives:
1. **Model the Complete PRD v1.2 Schema**: Configure collections (`articles`, `pages`), taxonomies (`category`, `tag`), bylines, navigation menus, and widget areas.
2. **Provide Production-Grade Indonesian Content**: Seed 10 rich, realistic articles authored by PKUMI scholars and researchers, complete with Quranic Arabic blocks (`Amiri` font), translations, transliterations, and academic footnotes.
3. **Power All Homepage & Detail Layouts**: Equip the system with all necessary presentation flags (`is_lead_hero`, `is_secondary_hero`, `is_featured`, `is_popular`, `popular_rank`, `reading_time`) so the 5-Card Bento Grid, Pattern A/B feeds, and Sidebar widgets render immediately upon database initialization.

---

## 2. Schema Architecture

```
seed/seed.json
├── meta & settings (site identity, tagline, branding)
├── collections
│   ├── articles (main longform editorial essays & exegesis)
│   └── pages (static/institutional pages)
├── taxonomies
│   ├── category (13 hierarchical exegesis disciplines)
│   └── tag (flat keywords & topics)
├── bylines (editorial profiles: PKUMI scholars & researchers)
├── menus (primary-nav, footer-nav, footer-editorial)
├── widgetAreas (sidebar widgets)
└── content (sample articles, pages, and term bindings)
```

---

## 3. Detailed Collection & Field Specifications

### 3.1 `articles` Collection

* **Slug**: `articles`
* **Label**: `Articles` / `Article`
* **Supports**: `["drafts", "revisions", "search", "seo"]`
* **Comments Enabled**: `false`

| Field Slug | Label | Type | Validation / Constraints | Purpose & Presentation Role |
| :--- | :--- | :--- | :--- | :--- |
| `title` | Judul Artikel | `string` | `required: true`, `searchable: true` | Primary headline (`--font-serif`, 36px/24px) |
| `subheadline` | Subjudul / Deskripsi Singkat | `string` | `required: false` | Italic subheadline under main title |
| `excerpt` | Ringkasan / Excerpt | `text` | `required: true`, `searchable: true` | 2–3 sentence summary for cards & meta description |
| `featured_image` | Gambar Sampul | `image` | `required: false` | High-res 16:9 / 16:10 cover image object (`$media`) |
| `content` | Isi Artikel & Kajian | `portableText` | `required: true`, `searchable: true` | Main body with Arabic ayat boxes & footnotes |
| `reading_time` | Estimasi Waktu Baca | `string` | `required: false` | Display string (e.g. `"6 mnt baca"`) |
| `is_lead_hero` | Tampilkan di Lead Hero Bento | `boolean` | `required: false` | Main 57% lead story on Homepage |
| `is_secondary_hero` | Tampilkan di Secondary Hero Bento | `boolean` | `required: false` | 4 stacked compact cards in Hero Bento |
| `is_featured` | Artikel Pilihan (Pattern A/B) | `boolean` | `required: false` | Highlighted editorial curation feed |
| `is_popular` | Tampilkan di Widget Terbanyak Dibaca | `boolean` | `required: false` | Sidebar top 5 reads widget |
| `popular_rank` | Urutan Popularitas (1–5) | `integer` | `required: false` | Ranking integer for `01`–`05` amber numerals |
| `popular_reads` | Jumlah Pembaca (Metrik) | `string` | `required: false` | Readership stat (e.g. `"18.4k dibaca"`) |
| `published_at` | Waktu Terbit | `datetime` | `required: false` | Publication timestamp for chronologic sorting |

### 3.2 `pages` Collection

* **Slug**: `pages`
* **Label**: `Pages` / `Page`
* **Supports**: `["drafts", "revisions", "search"]`

| Field Slug | Label | Type | Validation / Constraints | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `title` | Judul Halaman | `string` | `required: true`, `searchable: true` | Page title |
| `content` | Isi Halaman | `portableText` | `required: true`, `searchable: true` | Rich text page content |

---

## 4. Taxonomies Specification

### 4.1 Taxonomy: `category` (Hierarchical)
* **Name**: `category`
* **Label**: `Kategori` / `Kategori`
* **Collections**: `["articles"]`
* **Hierarchical**: `true`

**Pre-seeded Category Terms (13 Disciplines):**

| Term Slug | Label | Description |
| :--- | :--- | :--- |
| `tafsir-tematik` | Tafsir Tematik | Kajian tematik ayat Al-Qur'an berdasarkan isu kontemporer |
| `kosmologi-qurani` | Kosmologi Qur'ani | Diskursus sains, alam semesta, dan fisika dalam Al-Qur'an |
| `studi-naskah` | Studi Naskah | Filologi dan penelusuran manuskrip tafsir klasik & nusantara |
| `filsafat-islam` | Filsafat Islam | Epistemologi, ontologi, dan nalar rasional keislaman |
| `balaghah` | Balaghah & I'jaz | Keindahan retorika bahasa Arab dan mukjizat sastra Al-Qur'an |
| `manuskrip` | Manuskrip Kuno | Kajian kodikologi dan preservasi mushaf kuno |
| `sosio-historis` | Sosio-Historis | Asbabun nuzul dan konteks historis-sosiologis wahyu |
| `resensi-buku` | Resensi Buku | Tinjauan kritis karya-karya mutakhir studi Al-Qur'an |
| `hermeneutika` | Hermeneutika | Metodologi tafsir kontekstual dan teori penafsiran modern |
| `siyasah` | Siyasah & Etika Publik | Diskursus politik kenegaraan dan kemaslahatan publik |
| `tasawuf` | Tasawuf & Spiritualitas | Dimensi sufistik dan isyarat batin ayat Al-Qur'an |
| `gender-islam` | Gender & Keadilan | Keadilan relasi gender dan diskursus perempuan dalam tafsir |
| `filologi` | Filologi Nusantara | Tradisi keilmuan pesantren dan aksara pegon |

### 4.2 Taxonomy: `tag` (Flat)
* **Name**: `tag`
* **Label**: `Tag` / `Tag`
* **Collections**: `["articles"]`
* **Hierarchical**: `false`

**Sample Tag Terms:**
`istiqlal`, `pkumi`, `hermeneutika-feminis`, `tafsir-nusantara`, `ibn-kathir`, `muhammad-asad`, `alam-semesta`, `retorika-arab`, `pesantren`.

---

## 5. Bylines (Editorial Profiles)

Bylines represent scholars and researchers from PKUMI and the founding editorial board:

```json
[
  {
    "id": "byline-arofah",
    "slug": "arofah-nur",
    "displayName": "Arofah Nur, M.Ag.",
    "isGuest": false
  },
  {
    "id": "byline-hamdan",
    "slug": "dr-hamdan-syukri",
    "displayName": "Dr. Hamdan Syukri, M.Ud.",
    "isGuest": false
  },
  {
    "id": "byline-refian",
    "slug": "mochamad-refian-prasetyo",
    "displayName": "Mochamad Refian Prasetyo, S.Ag.",
    "isGuest": false
  },
  {
    "id": "byline-fikri",
    "slug": "fikri-anshari",
    "displayName": "Fikri Anshari, M.Hum.",
    "isGuest": false
  },
  {
    "id": "byline-iqbal",
    "slug": "muhammad-iqbal",
    "displayName": "Muhammad Iqbal, S.Ag.",
    "isGuest": false
  },
  {
    "id": "byline-nurul",
    "slug": "nurul-izzah",
    "displayName": "Nurul Izzah, M.Ag.",
    "isGuest": false
  }
]
```

---

## 6. Sample Content Matrix (10 Curated Articles)

| ID | Title & Theme | Category | Author | Role & Homepage Presentation |
| :--- | :--- | :--- | :--- | :--- |
| `art-01` | **Benarkah Hawa Penyebab Manusia Turun dari Surga? Meninjau Ulang Narasi Penciptaan dalam Literatur Tafsir** | `gender-islam` | Refian | **Lead Hero Bento (~57% width)**<br>Rank #1 Popular (`18.4k dibaca`) |
| `art-02` | **Kosmologi Big Bang dan Konsep Ratqan-Fataqnah: Perspektif Hermeneutika Saintifik** | `kosmologi-qurani` | Dr. Hamdan | **Secondary Hero #1**<br>Rank #2 Popular (`14.2k dibaca`) |
| `art-03` | **Menelusuri Genealogi Manuskrip Tafsir Nusantara: Dari Tarjuman Al-Mustafid hingga Marah Labid** | `studi-naskah` | Iqbal | **Secondary Hero #2** |
| `art-04` | **Hermeneutika Emansipatoris: Reinterpretasi Ayat-Ayat Relasi Gender di Era Digital** | `gender-islam` | Nurul Izzah | **Secondary Hero #3**<br>Rank #3 Popular (`11.8k dibaca`) |
| `art-05` | **Estetika I'jaz Lughawi: Rahasia Retorika Iltifat dalam Surah Al-Kautsar** | `balaghah` | Fikri | **Secondary Hero #4** |
| `art-06` | **Kritik Epistemologi Tafsir Tekstualis: Menghidupkan Maqashid Al-Qur'an dalam Realitas Sosial** | `filsafat-islam` | Arofah Nur | **Pattern A (Lead 50%)**<br>Rank #4 Popular (`9.6k dibaca`) |
| `art-07` | **Etika Lingkungan Hidup Berbasis Tafsir Ekologis: Memaknai Amanah Khilafah di Tengah Krisis Iklim** | `sosio-historis` | Dr. Hamdan | **Pattern A (Mini Stack #1)** |
| `art-08` | **Resensi Buku: Membongkar Nalar Oposisi Biner dalam Tafsir Kontemporer Karya Nasr Hamid** | `resensi-buku` | Refian | **Pattern A (Mini Stack #2)**<br>Rank #5 Popular (`8.1k dibaca`) |
| `art-09` | **Tafsir Maqashidi dalam Dialektika Siyasah Syar'iyyah dan Demokrasi Konstitusional** | `siyasah` | Arofah Nur | **Pattern B (Medium Lead #1)** |
| `art-10` | **Dimensi Tasawuf Falsafi dalam Isyarat Batin Surah An-Nur: Antara Nur Ilahi dan Kesadaran Manusia** | `tasawuf` | Dr. Hamdan | **Pattern B (Medium Lead #2)** |

---

## 7. Portable Text Custom Structure for Quranic Verses & Footnotes

In EmDash Portable Text, rich typography is represented with structured JSON blocks:

### 7.1 Arabic Verse Block (`AyatQuote`)
```json
[
  {
    "_type": "block",
    "style": "blockquote",
    "children": [
      {
        "_type": "span",
        "text": "فَوَسْوَسَ لَهُمَا الشَّيْطَانُ لِيُبْدِيَ لَهُمَا مَا وُورِيَ عَنْهُمَا مِنْ سَوْآتِهِمَا...\n",
        "marks": ["arabic"]
      },
      {
        "_type": "span",
        "text": "\"Lalu setan membisikkan pikiran jahat kepada keduanya untuk menampakkan kepada mereka apa yang tertutup dari mereka...\"\n",
        "marks": ["em"]
      },
      {
        "_type": "span",
        "text": "۞ — QS. Al-A'raf [7]: 20",
        "marks": ["strong"]
      }
    ]
  }
]
```

### 7.2 Academic Footnotes Block
```json
[
  {
    "_type": "block",
    "style": "h3",
    "children": [{ "_type": "span", "text": "Catatan Kaki & Rujukan" }]
  },
  {
    "_type": "block",
    "style": "normal",
    "children": [
      { "_type": "span", "text": "[1] ", "marks": ["strong"] },
      { "_type": "span", "text": "Ibnu Katsir, Tafsir Al-Qur'an Al-'Azhim (Beirut: Dar Al-Kutub Al-'Ilmiyyah, 1998), Jilid 3, hlm. 142." }
    ]
  },
  {
    "_type": "block",
    "style": "normal",
    "children": [
      { "_type": "span", "text": "[2] ", "marks": ["strong"] },
      { "_type": "span", "text": "Muhammad Asad, The Message of the Qur'an (Gibraltar: Dar Al-Andalus, 1980), penjelasan QS Thaha [20]: 120." }
    ]
  }
]
```

---

## 8. Site Settings & Navigation Menus

```json
{
  "settings": {
    "title": "Afaq Tafsir",
    "tagline": "Membaca Al-Qur'an, Melihat Lebih Luas",
    "subtagline": "Jurnal & Pemikiran Qur'ani"
  },
  "menus": [
    {
      "name": "primary",
      "label": "Navigasi Utama",
      "items": [
        { "type": "custom", "label": "Beranda", "url": "/" },
        { "type": "custom", "label": "Tentang", "url": "/tentang" },
        { "type": "custom", "label": "Kontak", "url": "/kontak" },
        { "type": "custom", "label": "Kirim Tulisan", "url": "/kirim-tulisan" }
      ]
    },
    {
      "name": "footer-nav",
      "label": "Navigasi Footer",
      "items": [
        { "type": "custom", "label": "Beranda Utama", "url": "/" },
        { "type": "custom", "label": "Kajian Pilihan Terkini", "url": "/#kajian-pilihan" },
        { "type": "custom", "label": "Pedoman Kirim Naskah", "url": "/kirim-tulisan" },
        { "type": "custom", "label": "Tentang Redaksi & Visi", "url": "/tentang" }
      ]
    }
  ]
}
```

---

## 9. Implementation & Validation Checklist

1. **Write `seed/seed.json`**: Construct and format the full JSON with all schema, bylines, taxonomies, menus, and 10 articles.
2. **Schema Verification**: Validate that field slugs, taxonomy names, and byline IDs match all references exactly.
3. **Apply & Verify**:
   - Run type generation: `bunx emdash types` (or verify `emdash-env.d.ts`).
   - Test dev server database initialization.
4. **Inspect in Admin Panel**: Open `http://localhost:4321/_emdash/admin` to confirm that all 10 articles, 13 categories, 6 bylines, and navigation menus are visible and editable.
