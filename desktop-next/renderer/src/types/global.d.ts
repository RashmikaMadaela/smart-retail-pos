export {};

declare global {
  interface Window {
    posApi: {
      login: (username: string, password: string) => Promise<{ ok: boolean; data?: any; error?: string }>;
      listProducts: (limit?: number) => Promise<{ ok: boolean; data?: any; error?: string }>;
      searchProducts: (searchText: string, limit?: number) => Promise<{ ok: boolean; data?: any; error?: string }>;
      getSummary: () => Promise<{ ok: boolean; data?: any; error?: string }>;
    };
  }
}
