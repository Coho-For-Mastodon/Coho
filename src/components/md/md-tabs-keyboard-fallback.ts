import type { MdTab } from './md-tab';

interface TablistContext {
    getTabs: () => MdTab[];
    getActivePanel: () => string;
    getOrientation: () => 'horizontal' | 'vertical';
    activate: (panel: string, tab: MdTab) => void;
}

/**
 * Creates a keydown handler implementing WAI-ARIA tab pattern:
 * Arrow keys (with wrap-around), Home, End.
 *
 * Used as a fallback when the native `focusgroup` HTML attribute
 * is not supported by the browser.
 */
export function createTablistKeydownHandler(
    ctx: TablistContext
): (e: KeyboardEvent) => void {
    return (e: KeyboardEvent) => {
        const tabs = ctx.getTabs().filter((tab) => !tab.disabled);
        if (tabs.length === 0) return;

        const isHorizontal = ctx.getOrientation() === 'horizontal';
        const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
        const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';

        let targetTab: MdTab | undefined;
        const currentIndex = tabs.findIndex(
            (tab) => tab.panel === ctx.getActivePanel()
        );

        switch (e.key) {
            case prevKey:
                targetTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
                break;
            case nextKey:
                targetTab = tabs[(currentIndex + 1) % tabs.length];
                break;
            case 'Home':
                targetTab = tabs[0];
                break;
            case 'End':
                targetTab = tabs[tabs.length - 1];
                break;
        }

        if (targetTab) {
            e.preventDefault();
            ctx.activate(targetTab.panel, targetTab);
        }
    };
}
