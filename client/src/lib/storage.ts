import { supabase } from "./supabase";

/**
 * Uploads a file to a Supabase Storage bucket and returns its public URL.
 * @param bucket Bucket name (e.g. 'omnibid-vault')
 * @param path Destination path inside the bucket
 * @param file File object to upload
 */
export async function uploadFile(bucket: string, path: string, file: File): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl;
}
