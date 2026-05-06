import type {
  FolderDirectory,
  FolderFileGroup,
  FolderFileSummary,
  FolderSummary,
} from './types';

export type FolderSortDirection = 'ASC' | 'DESC';
export type FolderSortField = 'fileName' | 'fileType' | 'mtime' | 'size' | 'tokenAt';

export interface FolderSortPreference {
  direction: FolderSortDirection;
  field: FolderSortField;
}

export const FOLDER_SORT_FIELD_LABEL: Record<FolderSortField, string> = {
  fileName: '文件名',
  fileType: '类型',
  mtime: '修改时间',
  size: '大小',
  tokenAt: '拍摄时间',
};

/**
 * Applies the shared folder-page sort preference to folders and direct files.
 * @param directory Folder directory returned by MT Photos APIs.
 * @param preference Active sort field and direction.
 * @returns Directory copy with sorted folders and file groups.
 */
export const sortDirectory = (
  directory: FolderDirectory,
  preference: FolderSortPreference,
): FolderDirectory => {
  return {
    ...directory,
    files: sortFileGroups(directory.files, preference),
    folders: [...directory.folders].sort((left, right) => compareFolders(left, right, preference)),
  };
};

const sortFileGroups = (
  groups: FolderFileGroup[],
  preference: FolderSortPreference,
): FolderFileGroup[] => {
  const sortedFiles = groups
    .flatMap((group) => group.list)
    .sort((left, right) => compareFiles(left, right, preference));

  if (sortedFiles.length === 0) {
    return [];
  }

  if (preference.field !== 'tokenAt' && preference.field !== 'mtime') {
    return [
      {
        day: `${FOLDER_SORT_FIELD_LABEL[preference.field]}排序`,
        list: sortedFiles,
      },
    ];
  }

  const groupMap = new Map<string, FolderFileSummary[]>();

  sortedFiles.forEach((file) => {
    const groupLabel =
      preference.field === 'mtime'
        ? file.modifiedDateLabel || '未知日期'
        : file.dateLabel || '未知日期';
    const groupFiles = groupMap.get(groupLabel) ?? [];

    groupFiles.push(file);
    groupMap.set(groupLabel, groupFiles);
  });

  return Array.from(groupMap.entries()).map(([day, list]) => ({ day, list }));
};

const compareFolders = (
  left: FolderSummary,
  right: FolderSummary,
  preference: FolderSortPreference,
): number => {
  const result =
    preference.field === 'size'
      ? compareNumber(getFolderContentCount(left), getFolderContentCount(right))
      : compareText(left.name, right.name);

  return (
    applyDirection(result, preference.direction) ||
    compareText(left.name, right.name) ||
    left.id - right.id
  );
};

const compareFiles = (
  left: FolderFileSummary,
  right: FolderFileSummary,
  preference: FolderSortPreference,
): number => {
  const result = getFileCompareResult(left, right, preference);

  return result || compareText(left.name, right.name) || left.id - right.id;
};

const getFileCompareResult = (
  left: FolderFileSummary,
  right: FolderFileSummary,
  preference: FolderSortPreference,
): number => {
  const { direction, field } = preference;

  if (field === 'size') {
    return compareOptionalNumber(left.sizeValue, right.sizeValue, direction);
  }

  if (field === 'tokenAt') {
    return compareOptionalNumber(left.dateValue, right.dateValue, direction);
  }

  if (field === 'mtime') {
    return compareOptionalNumber(left.modifiedValue, right.modifiedValue, direction);
  }

  if (field === 'fileType') {
    return applyDirection(compareText(left.fileType, right.fileType), direction);
  }

  return applyDirection(compareText(left.name, right.name), direction);
};

const applyDirection = (result: number, direction: FolderSortDirection): number => {
  if (result === 0) {
    return 0;
  }

  return direction === 'ASC' ? result : -result;
};

const compareOptionalNumber = (
  left: number | undefined,
  right: number | undefined,
  direction: FolderSortDirection,
): number => {
  if (left === undefined && right === undefined) {
    return 0;
  }

  if (left === undefined) {
    return 1;
  }

  if (right === undefined) {
    return -1;
  }

  return applyDirection(compareNumber(left, right), direction);
};

const compareNumber = (left: number, right: number): number => {
  return left === right ? 0 : left - right;
};

const WEB_TEXT_SORT_LOCALE = 'zh-Hans-CN';
const webTextCollator = createWebTextCollator();

/**
 * Compares text with the same natural locale semantics the Web folder page used originally.
 */
const compareText = (left: string, right: string): number => {
  if (webTextCollator) {
    return webTextCollator.compare(left, right);
  }

  return compareLocaleText(left, right) ?? compareFallbackNaturalText(left, right);
};

const getFolderContentCount = (folder: FolderSummary): number => {
  return folder.childCount + folder.fileCount + folder.trashCount;
};

function createWebTextCollator(): Intl.Collator | undefined {
  try {
    return new Intl.Collator(WEB_TEXT_SORT_LOCALE, {
      numeric: true,
      sensitivity: 'base',
    });
  } catch {
    return undefined;
  }
}

const compareLocaleText = (left: string, right: string): number | undefined => {
  try {
    return left.localeCompare(right, WEB_TEXT_SORT_LOCALE, {
      numeric: true,
      sensitivity: 'base',
    });
  } catch {
    return undefined;
  }
};

const compareFallbackNaturalText = (left: string, right: string): number => {
  const leftParts = splitNaturalText(left);
  const rightParts = splitNaturalText(right);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index];
    const rightPart = rightParts[index];

    if (leftPart === undefined) {
      return -1;
    }

    if (rightPart === undefined) {
      return 1;
    }

    const result =
      leftPart.numeric && rightPart.numeric
        ? compareNumberText(leftPart.value, rightPart.value)
        : compareCodePoints(leftPart.value, rightPart.value);

    if (result !== 0) {
      return result;
    }
  }

  return 0;
};

const splitNaturalText = (value: string): Array<{ numeric: boolean; value: string }> => {
  return (value.match(/\d+|\D+/g) ?? []).map((part) => ({
    numeric: /^\d+$/.test(part),
    value: part,
  }));
};

const compareNumberText = (left: string, right: string): number => {
  const normalizedLeft = left.replace(/^0+/, '') || '0';
  const normalizedRight = right.replace(/^0+/, '') || '0';

  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length - normalizedRight.length;
  }

  return compareCodePoints(normalizedLeft, normalizedRight) || left.length - right.length;
};

const compareCodePoints = (left: string, right: string): number => {
  const leftChars = Array.from(left);
  const rightChars = Array.from(right);
  const maxLength = Math.max(leftChars.length, rightChars.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftCodePoint = leftChars[index]?.codePointAt(0);
    const rightCodePoint = rightChars[index]?.codePointAt(0);

    if (leftCodePoint === undefined) {
      return -1;
    }

    if (rightCodePoint === undefined) {
      return 1;
    }

    if (leftCodePoint !== rightCodePoint) {
      return leftCodePoint - rightCodePoint;
    }
  }

  return 0;
};
