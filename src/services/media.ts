const root = await navigator.storage.getDirectory();
const mediaDir = await root.getDirectoryHandle('media', { create: true });

export async function addMedia(file: File) {
  // write file to private origin storage
  // add file to mediaDir
  const newHandle = await mediaDir.getFileHandle(file.name, { create: true });
  const writable = await newHandle.createWritable();
  await writable.write(file);
  await writable.close();
}

export async function getMedia(name: string) {
  // get file from mediaDir
  const fileHandle = await mediaDir.getFileHandle(name);
  const file = await fileHandle.getFile();
  return file;
}

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
