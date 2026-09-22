/**
 * Open a native file picker dialog.
 * Replaces the `browser-fs-access` library with a simple
 * native `<input type="file">` approach.
 */

interface FileOpenOptions {
  mimeTypes?: string[];
  multiple?: boolean;
  description?: string;
  startIn?: string;
}

export function fileOpen(
  options: FileOpenOptions & { multiple: true }
): Promise<File[]>;
export function fileOpen(options?: FileOpenOptions): Promise<File>;
export function fileOpen(
  options: FileOpenOptions = {}
): Promise<File | File[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';

    if (options.mimeTypes?.length) {
      input.accept = options.mimeTypes.join(',');
    }

    if (options.multiple) {
      input.multiple = true;
    }

    input.addEventListener('change', () => {
      const files = Array.from(input.files || []);
      if (files.length === 0) {
        reject(new DOMException('The user aborted a request.', 'AbortError'));
        return;
      }
      resolve(options.multiple ? files : files[0]);
    });

    // Handle cancel — the input won't fire 'change' if the user cancels,
    // but we can detect it via focus returning to the window.
    const onFocus = () => {
      // Small delay to let 'change' fire first if a file was selected
      setTimeout(() => {
        if (!input.files?.length) {
          reject(new DOMException('The user aborted a request.', 'AbortError'));
        }
        window.removeEventListener('focus', onFocus);
      }, 300);
    };
    window.addEventListener('focus', onFocus);

    input.click();
  });
}
