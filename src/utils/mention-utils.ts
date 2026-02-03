export interface MentionMatch {
  query: string;
  start: number;
  end: number;
}

export function findMentionMatch(
  text: string,
  cursor: number
): MentionMatch | null {
  const textBeforeCursor = text.slice(0, cursor);
  const match = textBeforeCursor.match(/(^|(?:\s|\(|\[|\{))@([\w@.-]{0,50})$/);

  if (!match) return null;

  const query = match[2] || '';
  const matchIndex = match.index ?? 0;
  const prefix = match[1] || '';
  const atIndex = matchIndex + prefix.length;

  return { query, start: atIndex, end: cursor };
}

export function estimateMentionDropdownHeight(
  resultsCount: number,
  isLoading: boolean
): number {
  if (isLoading) {
    return 52;
  }

  const itemCount = resultsCount > 0 ? resultsCount : 1;
  const rowHeight = 48;
  const padding = 12;
  return Math.min(240, itemCount * rowHeight + padding);
}

export function getCaretCoordinates(
  textarea: HTMLTextAreaElement,
  position: number
): { left: number; top: number; lineHeight: number } {
  const style = getComputedStyle(textarea);
  const div = document.createElement('div');
  const span = document.createElement('span');

  const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
    'MozTabSize',
    'whiteSpace',
    'wordBreak',
    'wordWrap',
  ];

  properties.forEach((prop) => {
    div.style.setProperty(prop, style.getPropertyValue(prop));
  });

  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.top = '0';
  div.style.left = '-9999px';
  div.style.overflow = 'hidden';

  div.textContent = textarea.value.substring(0, position);
  span.textContent = textarea.value.substring(position) || '.';
  div.appendChild(span);

  document.body.appendChild(div);

  const spanRect = span.getBoundingClientRect();
  const divRect = div.getBoundingClientRect();
  const lineHeight =
    parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;

  document.body.removeChild(div);

  const left = spanRect.left - divRect.left - textarea.scrollLeft;
  const top = spanRect.top - divRect.top - textarea.scrollTop;

  return { left, top, lineHeight };
}
