export default function getPublicIdFromUrl(url) {
  if (!url) return null;
  const parts = url.split("/upload/")[1];
  const withoutExtension = parts.split(".")[0];
  const publicId = withoutExtension.replace(/^v\d+\//, "");
  return publicId;
}
