import type { Post } from '../interfaces/Post';

export interface ThreadNode {
  post: Post;
  children: ThreadNode[];
  depth: number;
}

/**
 * Builds a tree structure from a flat array of descendant posts.
 * Each child is linked to its parent via `in_reply_to_id`.
 *
 * @param focalPostId - The ID of the focal/main post (root of the reply tree)
 * @param descendants - Flat array of descendant posts from the context API
 * @returns Array of top-level ThreadNodes (direct replies to the focal post)
 */
export function buildThreadTree(
  focalPostId: string,
  descendants: Post[]
): ThreadNode[] {
  // Map parent ID → children posts
  const childrenMap = new Map<string, Post[]>();

  for (const post of descendants) {
    const parentId = post.in_reply_to_id || focalPostId;
    const siblings = childrenMap.get(parentId);
    if (siblings) {
      siblings.push(post);
    } else {
      childrenMap.set(parentId, [post]);
    }
  }

  // Sort children at each level chronologically
  for (const children of childrenMap.values()) {
    children.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  // Recursively build tree nodes
  function buildNodes(parentId: string, depth: number): ThreadNode[] {
    const children = childrenMap.get(parentId);
    if (!children) return [];

    return children.map((post) => ({
      post,
      children: buildNodes(post.id, depth + 1),
      depth,
    }));
  }

  return buildNodes(focalPostId, 0);
}

/**
 * Maximum depth at which individual posts render inline.
 * Beyond this depth a "Continue this thread" link is shown.
 */
export const MAX_THREAD_DEPTH = 3;
