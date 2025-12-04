import { Emoji } from '../types/interfaces/Account';

export function parseEmojis(text: string, emojis: Emoji[], escape: boolean = false): string {
    if (!text) return '';

    let newText = text;

    if (escape) {
        newText = newText
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    if (!emojis || emojis.length === 0) {
        return newText;
    }

    emojis.forEach((emoji) => {
        const shortcode = `:${emoji.shortcode}:`;
        // Global replace
        newText = newText.split(shortcode).join(`<img src="${emoji.url}" alt="${shortcode}" class="custom-emoji" style="height: 1.2em; vertical-align: middle; object-fit: contain;" />`);
    });

    return newText;
}
