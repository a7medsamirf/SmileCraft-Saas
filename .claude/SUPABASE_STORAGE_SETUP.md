# Supabase Storage Setup Guide — SmileCraft CMS

## Overview

This guide walks you through creating and configuring the Supabase Storage bucket for patient file uploads (images, X-rays, PDFs).

---

## Step 1: Create Storage Bucket

### Via Supabase Dashboard

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New Bucket"**
4. Configure the bucket:

| Setting | Value |
|---------|-------|
| **Name** | `patient-files` |
| **Public** | ✅ Yes (files need to be viewable) |
| **File size limit** | `10 MB` |
| **Allowed MIME types** | Leave empty (we validate server-side) |

5. Click **"Create bucket"**

### Via SQL Migration (Alternative)

Run this SQL in Supabase SQL Editor:

```sql
-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('patient-files', 'patient-files', true, 10485760);

-- Set up RLS policies for the bucket
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'patient-files'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.users
    WHERE auth.uid() = id
  )
);

CREATE POLICY "Allow authenticated users to view files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'patient-files');

CREATE POLICY "Allow authenticated users to delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'patient-files'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.users
    WHERE auth.uid() = id
  )
);
```

---

## Step 2: Configure RLS Policies (If Using Dashboard)

After creating the bucket, set up these policies:

### Policy 1: Upload Files

- **Name**: `Allow authenticated users to upload files`
- **Target**: `INSERT`
- **Role**: `authenticated`
- **Policy definition**:
  ```sql
  (bucket_id = 'patient-files')
  ```

### Policy 2: View Files

- **Name**: `Allow authenticated users to view files`
- **Target**: `SELECT`
- **Role**: `authenticated`
- **Policy definition**:
  ```sql
  (bucket_id = 'patient-files')
  ```

### Policy 3: Delete Files

- **Name**: `Allow authenticated users to delete files`
- **Target**: `DELETE`
- **Role**: `authenticated`
- **Policy definition**:
  ```sql
  (bucket_id = 'patient-files')
  ```

---

## Step 3: Verify Bucket Access

### Test Upload via Dashboard

1. Go to **Storage** → `patient-files` bucket
2. Click **"Upload"**
3. Upload a test image
4. Verify the file appears and has a public URL

### Test via API

Run this in your browser console (with your Supabase URL and anon key):

```javascript
const supabaseUrl = 'https://your-project.supabase.co';
const anonKey = 'your-anon-key';

// Test upload
const formData = new FormData();
formData.append('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt');

fetch(`${supabaseUrl}/storage/v1/object/patient-files/test/test.txt`, {
  method: 'POST',
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
  },
  body: formData,
})
.then(res => res.json())
.then(console.log);
```

---

## Step 4: Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Step 5: Test File Upload in Application

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to a patient page**:
   ```
   http://localhost:3000/ar/dashboard/patients/[patient-id]
   ```

3. **Test the upload**:
   - Drag and drop an image
   - Verify the preview appears
   - Click "رفع الملف"
   - Check that the file appears in the media gallery

4. **Verify in Supabase**:
   - Go to Storage → `patient-files` bucket
   - Verify the file exists with correct path: `{patientId}/image/{timestamp}-{random}.{ext}`

---

## File Storage Structure

Files are organized as:

```
patient-files/
├── {patient-id-1}/
│   ├── image/
│   │   ├── 1713456789012-a3f5b8.jpg
│   │   └── 1713456890123-c7d9e2.png
│   ├── xray/
│   │   └── 1713456990234-f1g3h5.jpg
│   └── document/
│       └── 1713457090345-i7j9k1.pdf
├── {patient-id-2}/
│   └── ...
└── ...
```

---

## Troubleshooting

### Issue: "Bucket not found"

**Solution**: Verify the bucket name is exactly `patient-files` (case-sensitive).

### Issue: "Permission denied" on upload

**Solution**: Check RLS policies are configured correctly. The user must be authenticated.

### Issue: File uploads but doesn't appear in gallery

**Solution**: Check the browser console for errors. Verify the `media_files` table has the record.

### Issue: Large files failing

**Solution**: The limit is set to 10MB. Either:
- Reduce file size
- Increase limit in bucket settings
- Increase limit in `src/lib/storage.ts` (`MAX_FILE_SIZE`)

---

## Security Considerations

### Server-Side Validation

All uploads are validated server-side:
- ✅ File size (10MB max)
- ✅ File type (images, PDFs, documents only)
- ✅ Patient ownership (user must have access to patient)
- ✅ Clinic scoping (multi-tenant isolation)

### Client-Side Validation

Additionally validated client-side:
- ✅ File size check before upload
- ✅ File type check
- ✅ Preview generation for images

### Rate Limiting

File uploads are rate-limited:
- **10 uploads per minute** per user
- Prevents storage abuse
- Configurable in `src/lib/rate-limit.ts`

---

## Monitoring Storage Usage

### Check Bucket Size

Run in Supabase SQL Editor:

```sql
SELECT
  bucket_id,
  COUNT(*) as file_count,
  SUM((metadata->>'size')::bigint) as total_size_bytes
FROM storage.objects
WHERE bucket_id = 'patient-files'
GROUP BY bucket_id;
```

### Check Per-Patient Storage

```sql
SELECT
  (storage.foldername(name))[1] as patient_id,
  COUNT(*) as file_count,
  SUM((metadata->>'size')::bigint) as total_size_bytes
FROM storage.objects
WHERE bucket_id = 'patient-files'
GROUP BY patient_id
ORDER BY total_size_bytes DESC;
```

---

## Backup & Recovery

### Export File List

Run periodically to backup file metadata:

```sql
SELECT
  id,
  patient_id,
  file_name,
  file_url,
  file_type,
  size,
  created_at
FROM public.media_files
ORDER BY created_at DESC;
```

### Storage Backup

Supabase automatically backs up storage. For additional safety:
- Enable versioning in bucket settings
- Regularly export file URLs and metadata
- Consider external backup for critical files

---

## Next Steps

After setting up storage:

1. ✅ Test file upload flow
2. ✅ Test file gallery viewing
3. ✅ Test file deletion
4. ✅ Verify RLS policies work correctly
5. ✅ Monitor storage usage
6. ✅ Set up alerts for high usage (optional)

---

**Last Updated**: April 13, 2026  
**Bucket Name**: `patient-files`  
**Max File Size**: 10MB  
**Status**: Ready for production use
