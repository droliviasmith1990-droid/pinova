# Pinterest Template Editor

A professional-grade **bulk Pinterest pin generator** built with Next.js 16, Konva canvas, and Supabase. Create templates with dynamic text and image placeholders, then generate hundreds of unique pins from CSV data.

## ✨ Features

- **Visual Template Editor** - Drag-and-drop canvas with text, images, and shapes
- **Dynamic Fields** - Use `{{field_name}}` placeholders bound to CSV columns
- **Bulk Generation** - Generate unlimited pins from a single template + CSV
- **Canva Import** - Import Canva designs as background layers
- **Multi-select & Alignment** - Professional design tools with snap-to-grid
- **Cloud Storage** - Templates and generated pins stored in S3-compatible Tebi

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 16 App                         │
├─────────────────────────────────────────────────────────────┤
│  UI Layer                                                   │
│  ├── EditorCanvas.tsx (Konva Stage with zoom/pan)          │
│  ├── PropertiesPanel.tsx (Context-aware element editing)   │
│  └── LayersPanel.tsx (Drag-drop z-ordering)                │
├─────────────────────────────────────────────────────────────┤
│  State Management                                           │
│  └── editorStore.ts (Zustand - undo/redo, multi-select)    │
├─────────────────────────────────────────────────────────────┤
│  API Routes                                                 │
│  ├── /api/upload-pin (Upload generated pins to S3)         │
│  ├── /api/upload-thumbnail (Template thumbnails)           │
│  ├── /api/proxy-image (CORS proxy for S3 images)           │
│  └── /api/campaigns/[id]/* (Campaign management)           │
├─────────────────────────────────────────────────────────────┤
│  External Services                                          │
│  ├── Supabase (PostgreSQL + Auth)                          │
│  └── Tebi S3 (Image storage)                               │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the editor.

## ⚙️ Environment Variables

Create a `.env.local` file with:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Tebi S3 Storage (Required for pin generation)
TEBI_ENDPOINT=s3.tebi.io
TEBI_ACCESS_KEY=your-access-key
TEBI_SECRET_KEY=your-secret-key
TEBI_BUCKET=your-bucket-name
```

## 📁 Project Structure

```
src/
├── app/                     # Next.js App Router
│   ├── api/                 # API routes
│   ├── editor/              # Template editor page
│   ├── campaigns/           # Campaign management
│   └── settings/            # User settings
├── components/
│   ├── canvas/              # Konva canvas components
│   ├── panels/              # Right sidebar panels
│   └── ui/                  # Shared UI components
├── stores/
│   └── editorStore.ts       # Zustand state management
├── lib/
│   ├── supabase.ts          # Supabase client
│   ├── s3.ts                # Tebi S3 client
│   └── utils/               # CSV parsing, field detection
└── types/
    └── editor.ts            # TypeScript types
```

## 🔌 API Reference

### `POST /api/upload-pin`
Upload generated pin image to S3.

**Body (FormData):**
- `file` - PNG image file
- `campaign_id` - Campaign identifier
- `row_index` - Row number from CSV

**Body (JSON):**
```json
{
  "campaignId": "string",
  "pinNumber": 0,
  "imageData": "base64-encoded-png"
}
```

### `POST /api/upload-thumbnail`
Upload template thumbnail.

### `GET /api/proxy-image?url=...`
Proxy S3 images to bypass CORS restrictions.

## 🎨 Using Dynamic Fields

1. Add a text or image element
2. Name it `Text 1`, `Image 2`, etc. (auto-detects pattern)
3. Dynamic field is extracted: `text1`, `image2`
4. Reference in text with `{{field_name}}`
5. Match field names to CSV column headers

## 📦 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com)
3. Add environment variables
4. Deploy

### Manual
```bash
npm run build
npm start
```

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework with App Router |
| Zustand | Lightweight state management |
| Konva | 2D canvas rendering engine |
| Supabase | PostgreSQL database + Auth |
| Tebi S3 | S3-compatible object storage |
| Tailwind CSS | Utility-first styling |
| Radix UI | Accessible UI primitives |

## 📄 License

Private - All rights reserved
