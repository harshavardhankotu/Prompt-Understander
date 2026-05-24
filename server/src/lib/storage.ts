import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://mock.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "mock-key";

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generates a secure, temporary download URL for a private bucket file.
 * @param bucket Private bucket name
 * @param path File path inside the bucket
 * @param expiresInSeconds Lifetime of the signed URL (default 1 hour)
 */
export async function getSignedDownloadUrl(
  bucket: string,
  path: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) {
    throw new Error(`Failed to generate signed url: ${error.message}`);
  }
  return data.signedUrl;
}
