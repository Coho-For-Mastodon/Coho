import { describe, it, expect } from 'vitest';
import { buildThreadTree } from '../../src/utils/thread-tree';
import type { Post } from '../../src/interfaces/Post';

function makePost(id: string, inReplyToId: string | null): Post {
  return {
    id,
    in_reply_to_id: inReplyToId,
    created_at: new Date(Number(id)).toISOString(),
    content: `Post ${id}`,
    account: { id: `acct-${id}` },
  } as unknown as Post;
}

describe('buildThreadTree', () => {
  it('returns empty array for no descendants', () => {
    expect(buildThreadTree('root', [])).toEqual([]);
  });

  it('builds single-level children under focal post', () => {
    const descendants = [makePost('1', 'root'), makePost('2', 'root')];
    const tree = buildThreadTree('root', descendants);
    expect(tree).toHaveLength(2);
    expect(tree[0].post.id).toBe('1');
    expect(tree[1].post.id).toBe('2');
    expect(tree[0].depth).toBe(0);
    expect(tree[0].children).toHaveLength(0);
  });

  it('builds nested tree structure', () => {
    const descendants = [
      makePost('1', 'root'),
      makePost('2', '1'),
      makePost('3', '2'),
    ];
    const tree = buildThreadTree('root', descendants);
    expect(tree).toHaveLength(1);
    expect(tree[0].post.id).toBe('1');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].post.id).toBe('2');
    expect(tree[0].children[0].depth).toBe(1);
    expect(tree[0].children[0].children[0].post.id).toBe('3');
    expect(tree[0].children[0].children[0].depth).toBe(2);
  });

  it('sorts children chronologically', () => {
    const descendants = [
      makePost('3', 'root'),
      makePost('1', 'root'),
      makePost('2', 'root'),
    ];
    const tree = buildThreadTree('root', descendants);
    expect(tree.map((n) => n.post.id)).toEqual(['1', '2', '3']);
  });

  it('re-parents orphaned posts to focal post', () => {
    // Post 2 replies to a missing parent 'deleted'
    const descendants = [makePost('1', 'root'), makePost('2', 'deleted')];
    const tree = buildThreadTree('root', descendants);
    // Both should appear as top-level since 'deleted' is not in the list
    expect(tree).toHaveLength(2);
    expect(tree.map((n) => n.post.id)).toEqual(['1', '2']);
  });

  it('handles deep tree beyond MAX_THREAD_DEPTH', () => {
    const descendants = [
      makePost('1', 'root'),
      makePost('2', '1'),
      makePost('3', '2'),
      makePost('4', '3'),
      makePost('5', '4'),
    ];
    const tree = buildThreadTree('root', descendants);
    let node = tree[0];
    for (let i = 0; i < 4; i++) {
      expect(node.children).toHaveLength(1);
      node = node.children[0];
    }
    expect(node.post.id).toBe('5');
    expect(node.depth).toBe(4);
    expect(node.children).toHaveLength(0);
  });

  it('handles multiple branches from same parent', () => {
    const descendants = [
      makePost('1', 'root'),
      makePost('2', '1'),
      makePost('3', '1'),
    ];
    const tree = buildThreadTree('root', descendants);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children[0].post.id).toBe('2');
    expect(tree[0].children[1].post.id).toBe('3');
  });

  it('handles posts with null in_reply_to_id', () => {
    const descendants = [{ ...makePost('1', null) }];
    const tree = buildThreadTree('root', descendants);
    // null in_reply_to_id falls back to focalPostId
    expect(tree).toHaveLength(1);
    expect(tree[0].post.id).toBe('1');
  });
});
