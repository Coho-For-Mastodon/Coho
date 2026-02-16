import type { Post } from '../interfaces/Post';
import type {
  Filter,
  FilterContext,
  FilterResult,
  CreateFilterParams,
  UpdateFilterParams,
} from '../mastodon/types';
import {
  getFilters as mastodonGetFilters,
  getFilter as mastodonGetFilter,
  createFilter as mastodonCreateFilter,
  updateFilter as mastodonUpdateFilter,
  deleteFilter as mastodonDeleteFilter,
} from '../mastodon/api/filters';

export const getFilters = async (): Promise<Filter[]> => {
  return mastodonGetFilters();
};

export const getFilter = async (id: string): Promise<Filter> => {
  return mastodonGetFilter(id);
};

export const createFilter = async (
  params: CreateFilterParams
): Promise<Filter> => {
  return mastodonCreateFilter(params);
};

export const updateFilter = async (
  id: string,
  params: UpdateFilterParams
): Promise<Filter> => {
  return mastodonUpdateFilter(id, params);
};

export const deleteFilter = async (id: string): Promise<void> => {
  await mastodonDeleteFilter(id);
};

/**
 * Check if a filter has expired.
 */
function isFilterExpired(filter: Filter): boolean {
  if (!filter.expires_at) return false;
  return new Date(filter.expires_at).getTime() < Date.now();
}

/**
 * Check if a filter applies to the given context.
 */
function filterMatchesContext(filter: Filter, context: FilterContext): boolean {
  return filter.context.includes(context);
}

/**
 * Result of applying filters to a single post.
 */
export interface FilteredPost {
  post: Post;
  action: 'show' | 'warn' | 'hide';
  filterTitles: string[];
}

/**
 * Apply server-side filter results to a list of posts.
 * Returns posts annotated with filter action and titles.
 *
 * Posts with `hide` action should not be rendered.
 * Posts with `warn` action should show a warning overlay.
 *
 * @see https://docs.joinmastodon.org/api/guidelines/#filters
 */
export function applyFilters(
  posts: Post[],
  context: FilterContext
): FilteredPost[] {
  return posts.map((post) => {
    const targetPost = post.reblog ?? post;
    const results: FilterResult[] = targetPost.filtered ?? [];

    const activeResults = results.filter((r) => {
      const f = r.filter;
      return filterMatchesContext(f, context) && !isFilterExpired(f);
    });

    if (activeResults.length === 0) {
      return { post, action: 'show' as const, filterTitles: [] };
    }

    const hasHide = activeResults.some(
      (r) => r.filter.filter_action === 'hide'
    );
    if (hasHide) {
      return {
        post,
        action: 'hide' as const,
        filterTitles: activeResults.map((r) => r.filter.title),
      };
    }

    return {
      post,
      action: 'warn' as const,
      filterTitles: activeResults.map((r) => r.filter.title),
    };
  });
}

/**
 * Convenience: filter out hidden posts and return remaining posts,
 * annotating warned ones with `_filterTitles` for the UI.
 */
export function filterTimelinePosts(
  posts: Post[],
  context: FilterContext
): Post[] {
  const results = applyFilters(posts, context);
  const output: Post[] = [];

  for (const r of results) {
    if (r.action === 'hide') continue;
    if (r.action === 'warn') {
      (r.post as Post & { _filterTitles?: string[] })._filterTitles =
        r.filterTitles;
    }
    output.push(r.post);
  }

  return output;
}
