const root = await navigator.storage.getDirectory();
const mediaDir = await root.getDirectoryHandle('media', { create: true });

export async function getAllMedia() {
  // get all files from mediaDir
  const promises = [];
  // @ts-expect-error - FileSystemDirectoryHandle.values() async iterator types
  for await (const entry of mediaDir.values()) {
    if (entry.kind !== 'file') {
      continue;
    }
    promises.push(entry.getFile());
  }
  const result = await Promise.all(promises);

  return result;
}
