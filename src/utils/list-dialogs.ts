import { lazyLoad, componentLoaders } from './lazy-component-loader';

export const ensureListsDialogLoaded = async (): Promise<void> => {
  await lazyLoad('listsDialog', componentLoaders.listsDialog);
};

export const ensureListMembershipDialogLoaded = async (): Promise<void> => {
  await lazyLoad('listMembershipDialog', componentLoaders.listMembershipDialog);
};
