export const formatKM = (n: number) =>
  new Intl.NumberFormat("bs-BA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " KM";

export const formatDate = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("bs-BA", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const formatNumber = (n: number, digits = 2) =>
  new Intl.NumberFormat("bs-BA", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
