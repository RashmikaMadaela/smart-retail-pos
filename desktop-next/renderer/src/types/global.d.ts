export {};

declare global {
  interface Window {
    posApi: {
      login: (username: string, password: string) => Promise<{ ok: boolean; data?: any; error?: string }>;
      listProducts: (limit?: number) => Promise<{ ok: boolean; data?: any; error?: string }>;
      searchProducts: (searchText: string, limit?: number) => Promise<{ ok: boolean; data?: any; error?: string }>;
      getSummary: () => Promise<{ ok: boolean; data?: any; error?: string }>;
      processSale: (payload: unknown) => Promise<{ ok: boolean; data?: any; error?: string }>;
      holdSale: (payload: unknown) => Promise<{ ok: boolean; data?: any; error?: string }>;
      listHeldSales: (cashierId?: number) => Promise<{ ok: boolean; data?: any; error?: string }>;
      recallHeldSale: (saleId: number) => Promise<{ ok: boolean; data?: any; error?: string }>;
      completeHeldSale: (payload: unknown) => Promise<{ ok: boolean; data?: any; error?: string }>;
    };
  }
}
