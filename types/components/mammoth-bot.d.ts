import { LitElement } from 'lit';
import '../components/md/md-text-area';
interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
export declare class MammothBot extends LitElement {
    previousMessages: ChatMessage[];
    private textArea;
    private messageList;
    static styles: import("lit").CSSResult[];
    handleInput(): Promise<void>;
    copyContent(content: string): void;
    render(): import("lit-html").TemplateResult<1>;
}
export {};
