import { DUPLICATE_LIMIT_ERROR } from "@/constants";

/**
 * CRRU-specific: photo names follow `YYYYMMDD_NNND_AAA`, where the fourth digit is a duplicate
 * counter that is rewritten in place rather than appended to, and caps at 9.
 */
const CRRU_PHOTO_NAME_PATTERN = /^(\d{8}_\d{3})(\d)(_\w+)$/;
const CRRU_MAX_DUPLICATE_COUNTER = 9;

/**
 * Returns the CRRU name with its counter digit advanced past the highest one already in use, or
 * null when the name is not in CRRU format. Throws once the counter is exhausted.
 */
const nextCrruBaseName = (baseName: string, existingBaseNames: string[]): string | null => {
  const match = CRRU_PHOTO_NAME_PATTERN.exec(baseName);
  if (match === null) {
    return null;
  }

  const [, prefix, sourceCounter, suffix] = match;

  // Seeded with the source's own counter so a source whose file is missing from disk still counts
  let highest = Number(sourceCounter);

  for (const existing of existingBaseNames) {
    const existingMatch = CRRU_PHOTO_NAME_PATTERN.exec(existing);
    if (existingMatch === null) {
      continue;
    }

    const [, existingPrefix, existingCounter, existingSuffix] = existingMatch;
    if (existingPrefix !== prefix || existingSuffix !== suffix) {
      continue;
    }

    highest = Math.max(highest, Number(existingCounter));
  }

  if (highest >= CRRU_MAX_DUPLICATE_COUNTER) {
    throw new Error(DUPLICATE_LIMIT_ERROR);
  }

  return `${prefix}${highest + 1}${suffix}`;
};

/**
 * Strips a trailing `_<number>` counter to find the name a duplicate belongs to, so duplicating a
 * duplicate extends the family (`photo_2` > `photo_3`) instead of nesting (`photo_2_2`). Camera
 * names such as `DSC_0001` must not be mistaken for a counter, so the trailing number only counts
 * as one when the un-suffixed name is present too.
 */
const findStem = (baseName: string, existingBaseNames: string[]): string => {
  const separatorIndex = baseName.lastIndexOf("_");
  if (separatorIndex <= 0) {
    return baseName;
  }

  const trailing = baseName.slice(separatorIndex + 1);
  if (!/^\d+$/.test(trailing)) {
    return baseName;
  }

  const stem = baseName.slice(0, separatorIndex);
  if (!existingBaseNames.includes(stem)) {
    return baseName;
  }

  return stem;
};

/**
 * Returns the name with a `_<number>` counter one past the highest already in use for its stem.
 * The counter is appended rather than occupying a fixed-width field, so it is unbounded.
 */
const nextCountedBaseName = (baseName: string, existingBaseNames: string[]): string => {
  const stem = findStem(baseName, existingBaseNames);

  // The un-suffixed name is the first of its family, so counting starts from it
  let highest = 1;

  for (const existing of existingBaseNames) {
    if (!existing.startsWith(`${stem}_`)) {
      continue;
    }

    const counter = existing.slice(stem.length + 1);
    if (!/^\d+$/.test(counter)) {
      continue;
    }

    highest = Math.max(highest, Number(counter));
  }

  return `${stem}_${highest + 1}`;
};

/**
 * Returns the base name (no extension) to give a duplicate of `baseName`. Pass the
 * extension-stripped names of everything already in the project directory as `existingBaseNames`,
 * so a duplicate never lands on a name that is taken by another extension.
 */
export const nextDuplicateBaseName = (baseName: string, existingBaseNames: string[]): string =>
  nextCrruBaseName(baseName, existingBaseNames) ?? nextCountedBaseName(baseName, existingBaseNames);
