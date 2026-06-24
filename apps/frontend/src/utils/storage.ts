export const storage = {
  get: (key: string): string | null => (typeof window === 'undefined' ? null : window.localStorage.getItem(key)),
  set: (key: string, value: string): void => { if (typeof window !== 'undefined') window.localStorage.setItem(key, value); },
  remove: (key: string): void => { if (typeof window !== 'undefined') window.localStorage.removeItem(key); },
};
