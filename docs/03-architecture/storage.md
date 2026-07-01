# Storage

Supabase Storage buckets and their access rules.

| Bucket | Access | Purpose | Path pattern |
|---|---|---|---|
| `org-logos` | Public read, authenticated write | Org logos shown in public embeds and marketing | `<org_id>/logo.<ext>` |
| `brand-assets` | Org folder RLS | Brand kit files (fonts, secondary logos, imagery) | `<org_id>/…` |
| `design-assets` | Org folder RLS | Source images used in the design/flyer generator | `<org_id>/…` |
| `design-renders` | Org folder RLS | Final PNGs from `render-design` | `<org_id>/<design_id>.png` |
| `org-shared-files` | Org folder RLS + admin | Files shared between the org and Curve | `<org_id>/…` |
| `acquisition-documents` | Admin + portal-user narrow read | Diligence and integration docs | `<acquisition_id>/…` |
| `event-w9s` | Admin only | Vendor tax forms | `<event_id>/…` |

## The folder-RLS pattern

```sql
create policy "org members read their folder"
  on storage.objects for select
  using (
    bucket_id = 'brand-assets'
    and (storage.foldername(name))[1] = current_org_id()::text
  );
```

Repeat for insert/update/delete. Admin bypass added via `has_role(auth.uid(), 'admin')`.

## Signed URLs vs public URLs

- `org-logos` uses `getPublicUrl` — safe.
- Everything else uses **signed URLs** (1h expiry) generated on demand.
- The `SharedFilesTab` component fetches file contents as a blob rather than embedding a signed URL directly, which avoids CORS/header issues in the PDF/image preview.

## Uploads

- Client uses `supabase.storage.from('bucket').upload(path, file, { upsert: true })`.
- Path always starts with the target `org_id` or `acquisition_id` — RLS enforces the match.
- Large files (>10 MB): still direct client upload (Supabase supports resumable, not implemented in UI today).

## Cleanup

- Deleting an org triggers `admin_cascade_delete_org` which enumerates and deletes storage objects across every bucket. Cascade first, storage last — see `delete-organization` edge function.

## See also

- [`security-model.md`](./security-model.md)
