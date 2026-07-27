type NavigableOption = {
  readonly value: string;
  readonly disabled?: boolean;
};

export function findNextEnabledOptionIndex(
  options: readonly NavigableOption[],
  currentIndex: number,
  direction: 1 | -1,
): number {
  if (options.length === 0) {
    return -1;
  }

  for (let offset = 1; offset <= options.length; offset += 1) {
    const candidateIndex = (currentIndex + direction * offset + options.length) % options.length;
    if (!options[candidateIndex]?.disabled) {
      return candidateIndex;
    }
  }

  return -1;
}
