import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';

const hoisted = vi.hoisted(() => {
  return {
    getCredentials: vi.fn(),
    editAccount: vi.fn(),
    fileOpen: vi.fn(),
    navigate: vi.fn(),
  };
});

vi.mock('../../src/services/account', () => ({
  getCredentials: hoisted.getCredentials,
  editAccount: hoisted.editAccount,
}));

vi.mock('browser-fs-access', () => ({
  fileOpen: hoisted.fileOpen,
}));

vi.mock('../../src/router/routes', () => ({
  router: {
    navigate: hoisted.navigate,
  },
}));

import '../../src/components/edit-account';
import type { EditAccount } from '../../src/components/edit-account';

const mockCredentials = {
  display_name: 'Coho User',
  avatar: '/assets/avatar.png',
  header: '/assets/header.png',
  locked: true,
  bot: false,
  discoverable: false,
  hide_collections: true,
  indexable: false,
  source: {
    note: 'Hello world',
    privacy: 'unlisted',
    sensitive: true,
    language: 'en',
    fields: [
      { name: 'Website', value: 'https://coho.app' },
      { name: 'Team', value: 'Cohos' },
    ],
  },
};

describe('edit-account', () => {
  beforeEach(() => {
    cleanupFixtures();
    vi.clearAllMocks();
    hoisted.getCredentials.mockResolvedValue(mockCredentials);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads credentials into local state', async () => {
    const el = await fixture<EditAccount>(html`<edit-account></edit-account>`);

    await (el as any).loadCredentials();
    await elementUpdated(el);

    expect((el as any).loading).toBe(false);
    expect((el as any).displayName).toBe('Coho User');
    expect((el as any).bio).toBe('Hello world');
    expect((el as any).avatarPreviewUrl).toBe('/assets/avatar.png');
    expect((el as any).headerPreviewUrl).toBe('/assets/header.png');
    expect((el as any).locked).toBe(true);
    expect((el as any).discoverable).toBe(false);
    expect((el as any).hideCollections).toBe(true);
    expect((el as any).indexable).toBe(false);
    expect((el as any).defaultPrivacy).toBe('unlisted');
    expect((el as any).defaultSensitive).toBe(true);
    expect((el as any).defaultLanguage).toBe('en');
    expect((el as any).fields.length).toBe(2);
  });

  it('adds, updates, and removes profile fields', async () => {
    const el = await fixture<EditAccount>(html`<edit-account></edit-account>`);
    await elementUpdated(el);

    (el as any).fields = [{ name: 'A', value: '1' }];

    (el as any).addField();
    expect((el as any).fields.length).toBe(2);

    (el as any).updateFieldName(1, 'B');
    (el as any).updateFieldValue(1, '2');
    expect((el as any).fields[1]).toEqual({ name: 'B', value: '2' });

    (el as any).removeField(0);
    expect((el as any).fields).toEqual([{ name: 'B', value: '2' }]);
  });

  it('saves changes and navigates after success', async () => {
    vi.useFakeTimers();
    hoisted.editAccount.mockResolvedValue(undefined);

    const el = await fixture<EditAccount>(html`<edit-account></edit-account>`);
    await elementUpdated(el);

    (el as any).displayName = 'Updated';
    (el as any).bio = 'Bio';
    (el as any).fields = [{ name: 'Site', value: 'https://coho.app' }];
    (el as any).defaultPrivacy = 'public';
    (el as any).defaultSensitive = false;
    (el as any).defaultLanguage = '';

    const toast = el.shadowRoot?.querySelector('md-toast') as
      | (HTMLElement & { show: () => void })
      | null;
    if (toast) {
      toast.show = vi.fn();
    }

    await (el as any).save();

    expect(hoisted.editAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: 'Updated',
        note: 'Bio',
        fields_attributes: [{ name: 'Site', value: 'https://coho.app' }],
        source: {
          privacy: 'public',
          sensitive: false,
          language: undefined,
        },
      })
    );

    vi.runAllTimers();
    expect(hoisted.navigate).toHaveBeenCalledWith('/home');
  });

  it('updates avatar and header previews when files are chosen', async () => {
    const el = await fixture<EditAccount>(html`<edit-account></edit-account>`);
    await elementUpdated(el);

    const avatarFile = new File(['avatar'], 'avatar.png', {
      type: 'image/png',
    });
    const headerFile = new File(['header'], 'header.png', {
      type: 'image/png',
    });

    const createUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:avatar')
      .mockReturnValueOnce('blob:header');

    hoisted.fileOpen.mockResolvedValueOnce(avatarFile);
    await (el as any).changeAvatar();

    hoisted.fileOpen.mockResolvedValueOnce(headerFile);
    await (el as any).changeHeader();

    expect((el as any).newAvatar).toBe(avatarFile);
    expect((el as any).avatarPreviewUrl).toBe('blob:avatar');
    expect((el as any).newHeader).toBe(headerFile);
    expect((el as any).headerPreviewUrl).toBe('blob:header');

    createUrlSpy.mockRestore();
  });
});
