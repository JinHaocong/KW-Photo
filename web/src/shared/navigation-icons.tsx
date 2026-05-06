import {
  CalendarDays,
  Clock3,
  EyeOff,
  Folder,
  Images,
  Map,
  Search,
  Settings,
  ShieldCheck,
  Share2,
  Tag,
  Trash2,
  UploadCloud,
  Users,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ReactNode } from 'react';

import type { WorkspacePage } from './types';

const DEFAULT_ICON_PROPS: LucideProps = {
  'aria-hidden': true,
  size: 18,
  strokeWidth: 2.2,
};

/**
 * Renders workspace page icons from one icon family so visual weight stays consistent.
 */
export const renderWorkspacePageIcon = (
  page: WorkspacePage,
  props: LucideProps = {},
): ReactNode => {
  const iconProps = { ...DEFAULT_ICON_PROPS, ...props };

  if (page === 'photos') {
    return <CalendarDays {...iconProps} />;
  }

  if (page === 'recent') {
    return <Clock3 {...iconProps} />;
  }

  if (page === 'albums') {
    return <Images {...iconProps} />;
  }

  if (page === 'folders') {
    return <Folder {...iconProps} />;
  }

  if (page === 'people') {
    return <Users {...iconProps} />;
  }

  if (page === 'map') {
    return <Map {...iconProps} />;
  }

  if (page === 'search') {
    return <Search {...iconProps} />;
  }

  if (page === 'tags') {
    return <Tag {...iconProps} />;
  }

  if (page === 'upload') {
    return <UploadCloud {...iconProps} />;
  }

  if (page === 'share') {
    return <Share2 {...iconProps} />;
  }

  if (page === 'trash') {
    return <Trash2 {...iconProps} />;
  }

  if (page === 'hidden') {
    return <EyeOff {...iconProps} />;
  }

  if (page === 'admin') {
    return <ShieldCheck {...iconProps} />;
  }

  if (page === 'settings') {
    return <Settings {...iconProps} />;
  }

  return <Search {...iconProps} />;
};
