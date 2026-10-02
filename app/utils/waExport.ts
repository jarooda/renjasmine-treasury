import { formatCurrency } from "~/utils/formatters";

export type ExportRow = {
  tanggal: string; // YYYY-MM-DD
  uraian: string;
  nama: string;
  jumlah: number;
  jenis: "In" | "Out";
  pos: string;
};

export type MonthlyExport = {
  month: number;
  year: number;
  pemasukan: number;
  pengeluaran: number;
  rows: ExportRow[];
};

export const monthName = (month: number) =>
  new Date(2000, month - 1, 1).toLocaleDateString("id-ID", { month: "long" });

/** YYYY-MM-DD -> dd/mm/yyyy */
const toDisplayDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

// Multi-line cells would break the bullet list, so join their lines with commas
const toOneLine = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(", ");

// Only Buku Kas carries the resident name (who paid / who received)
const formatLine = (row: ExportRow) => {
  const parts = [toDisplayDate(row.tanggal), toOneLine(row.uraian)];
  if (row.pos === "Buku Kas" && row.nama) parts.push(toOneLine(row.nama));
  return `${parts.join(" - ")} sebesar ${formatCurrency(row.jumlah)}`;
};

export const buildWhatsappMessage = (
  data: MonthlyExport,
  siteUrl?: string,
): string => {
  const period = `${monthName(data.month)} ${data.year}`;
  const lines: string[] = [
    "Assalamualaikum Bapak/Ibu warga Renjana & Jasmine 🙏",
    `Berikut rekap arus kas bulan *${period}*:`,
    "",
  ];

  if (data.rows.length === 0) {
    lines.push(`Belum ada transaksi yang tercatat di bulan ${period}.`);
  } else {
    lines.push(
      `💰 Pemasukan: *${formatCurrency(data.pemasukan)}*`,
      `💸 Pengeluaran: *${formatCurrency(data.pengeluaran)}*`,
    );

    const pemasukan = data.rows.filter((row) => row.jenis === "In");
    const pengeluaran = data.rows.filter((row) => row.jenis === "Out");

    const topPengeluaran = [...pengeluaran]
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 5);
    if (topPengeluaran.length > 0) {
      lines.push(
        "",
        topPengeluaran.length > 1
          ? `*${topPengeluaran.length} pengeluaran terbesar bulan ini:*`
          : "*Pengeluaran bulan ini:*",
        ...topPengeluaran.map(
          (row, index) => `${index + 1}. ${formatLine(row)}`,
        ),
      );
    }

    lines.push("", "Dengan rincian sebagai berikut:");
    if (pemasukan.length > 0) {
      lines.push(
        "",
        `*Pemasukan (${pemasukan.length} transaksi)*`,
        ...pemasukan.map((row) => `- ${formatLine(row)}`),
      );
    }
    if (pengeluaran.length > 0) {
      lines.push(
        "",
        `*Pengeluaran (${pengeluaran.length} transaksi)*`,
        ...pengeluaran.map((row) => `- ${formatLine(row)}`),
      );
    }
  }

  lines.push("");
  if (siteUrl) {
    lines.push(`Untuk detail lengkapnya bisa dicek di ${siteUrl}`);
  }
  lines.push(
    "Kalau ada yang kurang sesuai, silakan japri pengurus ya. Terima kasih 🙏",
  );

  return lines.join("\n");
};
