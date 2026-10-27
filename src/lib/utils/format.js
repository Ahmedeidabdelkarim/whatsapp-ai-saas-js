export const sar = (halalas) => `${(halalas / 100).toLocaleString("en-US")} ر.س`;
export const num = (n) => n.toLocaleString("en-US");
export const startOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); };
