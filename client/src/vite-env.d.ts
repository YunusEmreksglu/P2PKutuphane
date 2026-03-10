/// <reference types="vite/client" />

declare module 'epubjs' {
  interface Location {
    start: {
      cfi: string;
      displayed: {
        page: number;
        total: number;
      };
    };
    end: {
      cfi: string;
    };
  }

  interface Rendition {
    display(target?: string): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
    themes: {
      default(styles: Record<string, any>): void;
      fontSize(size: string): void;
    };
    destroy(): void;
  }

  interface Book {
    renderTo(element: HTMLElement, options?: any): Rendition;
    destroy(): void;
    loaded: {
      navigation: Promise<any>;
      metadata: Promise<any>;
    };
    locations: {
      generate(chars?: number): Promise<string[]>;
      percentageFromCfi(cfi: string): number;
    };
  }

  function ePub(url: string, options?: any): Book;
  export default ePub;
}
