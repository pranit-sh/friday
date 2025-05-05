export function truncateCenterString(fullStr: string, strLen: number, separator?: string) {
  if (fullStr.length <= strLen) {
    return fullStr;
  }

  separator = separator || '...';

  const sepLen = separator.length,
    charsToShow = strLen - sepLen,
    frontChars = Math.ceil(charsToShow / 2),
    backChars = Math.floor(charsToShow / 2);

  return (
    fullStr.substring(0, frontChars) + separator + fullStr.substring(fullStr.length - backChars)
  );
}

export function cleanString(text: string) {
  text = text.replace(/\\/g, '');
  text = text.replace(/#/g, ' ');
  text = text.replace(/\. \./g, '.');
  text = text.replace(/\s\s+/g, ' ');
  text = text.replace(/(\r\n|\n|\r)/gm, ' ');

  return text.trim();
}

export function isValidURL(candidateUrl: string) {
  try {
    const url = new URL(candidateUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
