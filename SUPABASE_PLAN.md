# Supabase Share Feature Implementation Plan

## Overview
Add a "Share" button that uploads the current comparison (A/B images + metadata) to Supabase, then generates a shareable link. When visiting that link, the app loads the shared comparison.

## Supabase Setup (One-time)

### 1. Create Supabase Project
- Go to supabase.com, create new project
- Note down: `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### 2. Create Storage Bucket
```sql
-- In Supabase dashboard > Storage
-- Create bucket named "comparisons" with public access
```

### 3. Create Database Table
```sql
create table shared_comparisons (
  id uuid primary key default gen_random_uuid(),
  name text,
  image_a_path text not null,  -- storage path
  image_b_path text not null,  -- storage path
  annotations jsonb,           -- strokes array
  view_mode text default 'slider',
  created_at timestamptz default now()
);

-- Enable public read access (no auth required)
alter table shared_comparisons enable row level security;
create policy "Public read" on shared_comparisons for select using (true);
create policy "Public insert" on shared_comparisons for insert with check (true);
```

---

## Code Changes

### 1. Install Supabase SDK
```bash
npm install @supabase/supabase-js
```

### 2. New Files to Create

#### `src/lib/supabase.js`
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

#### `src/hooks/useShare.js`
Hook to handle share/load logic:
- `shareComparison(imageA, imageB, metadata)` - uploads images, inserts DB row, returns share ID
- `loadSharedComparison(id)` - fetches from DB, returns image URLs + metadata

### 3. Files to Modify

#### `src/App.jsx`
- Add URL parameter detection for shared links (`?share=<uuid>`)
- On load, check if `share` param exists → call `loadSharedComparison()`
- Pass share function down to toolbar/sidebar

#### `src/components/Toolbar.jsx` (or new ShareButton component)
- Add "Share" button
- On click:
  1. Get current A/B image blobs
  2. Call `shareComparison()`
  3. Copy link to clipboard / show modal with link

#### `.env` (create)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

---

## Share Flow (User clicks "Share")

```
1. User clicks Share button
2. Fetch current images as Blobs (from canvas or img src)
3. Upload to Supabase Storage:
   - comparisons/{uuid}/A.png
   - comparisons/{uuid}/B.png
4. Insert row into shared_comparisons table with:
   - image paths
   - current annotations (if any)
   - comparison name
5. Generate shareable URL: https://yourapp.com/?share={uuid}
6. Copy to clipboard, show success toast
```

## Load Flow (User opens shared link)

```
1. App detects ?share=<uuid> in URL
2. Query shared_comparisons table by ID
3. Get public URLs for images from Storage
4. Set as current comparison (like a "local comparison" but from cloud)
5. Load annotations if present
6. User sees the shared comparison
```

---

## Files Summary

| Action | File |
|--------|------|
| Create | `src/lib/supabase.js` - Supabase client init |
| Create | `src/hooks/useShare.js` - share/load logic |
| Create | `.env` - environment variables |
| Modify | `src/App.jsx` - URL param detection, share state |
| Modify | `src/components/Toolbar.jsx` - Share button |

---

## Verification

1. Start app, load a comparison
2. Click "Share" → should upload and show link
3. Open link in new tab → should load same comparison with images
4. Check Supabase dashboard → see uploaded images in Storage, row in table
