import { useEffect, useState } from "react";
import ExcelJS from "exceljs";

const API_URL =
import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const initialForm = {
  kode: "",
  nama: "",
  satuan: "pcs",
  hargaBeli: "",
  hargaJual: "",
  stok: "0",
  stokMinimum: "5",
  categoryId: "",
};

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [archivedProducts, setArchivedProducts] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stockMovements, setStockMovements] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockSaving, setStockSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [stockFilter, setStockFilter] = useState("SEMUA");
  const [stockForm, setStockForm] = useState({
  
    productId: "",
    jenis: "MASUK",
    jumlah: "1",
    catatan: "",
  });

  async function fetchData() {
    try {
      setLoading(true);
      setError("");

      const [productResponse, categoryResponse, stockResponse] =
        await Promise.all([
          fetch(`${API_URL}/products`),
          fetch(`${API_URL}/categories`),
          fetch(`${API_URL}/stock`),
        ]);

      if (
  !productResponse.ok ||
  !categoryResponse.ok ||
  !stockResponse.ok
) {
  throw new Error("Gagal mengambil data dari server.");
}

      const productData = await productResponse.json();
const categoryData = await categoryResponse.json();
const stockData = await stockResponse.json();

setProducts(productData);
setCategories(categoryData);
setStockMovements(stockData);
    } catch (err) {
      setError(
        "Tidak dapat terhubung ke backend. Pastikan server berjalan di localhost:3000."
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchArchivedProducts() {
  try {
    const response = await fetch(`${API_URL}/products/archived`);

    if (!response.ok) {
      throw new Error("Gagal mengambil produk arsip.");
    }

    const data = await response.json();
    setArchivedProducts(data);
  } catch (error) {
    console.error("Gagal mengambil produk arsip:", error);
    setError("Gagal mengambil daftar produk yang diarsipkan.");
  }
}

async function handleRestoreProduct(id) {
  try {
    setError("");
    setSuccess("");

    const response = await fetch(
      `${API_URL}/products/${id}/restore`,
      {
        method: "PATCH",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Gagal memulihkan produk.");
    }

    setSuccess(result.message);

    await fetchData();
    await fetchArchivedProducts();
  } catch (error) {
    setError(error.message || "Gagal memulihkan produk.");
  }
}

async function handlePermanentDeleteProduct(product) {
  const confirmed = window.confirm(
    `PERINGATAN!\n\nApakah kamu yakin ingin menghapus permanen produk ${product.kode} - ${product.nama}?\n\nSeluruh riwayat pergerakan stok produk ini juga akan dihapus dan tidak dapat dikembalikan.`
  );

  if (!confirmed) return;

  try {
    setError("");
    setSuccess("");

    const response = await fetch(
      `${API_URL}/products/${product.id}/permanent`,
      {
        method: "DELETE",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Gagal menghapus produk permanen.");
    }

    setSuccess(result.message);

    await fetchData();
    await fetchArchivedProducts();
  } catch (error) {
    setError(error.message || "Gagal menghapus produk permanen.");
  }
}

  useEffect(() => {
    fetchData();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleStockChange(event) {
  const { name, value } = event.target;

  setStockForm((prev) => ({
    ...prev,
    [name]: value,
  }));
}

async function handleStockSubmit(event) {
  event.preventDefault();
  setStockSaving(true);
  setError("");
  setSuccess("");

  try {
    const response = await fetch(`${API_URL}/stock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...stockForm,
        productId: Number(stockForm.productId),
        jumlah: Number(stockForm.jumlah),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Gagal menyimpan pergerakan stok.");
    }

    setSuccess(result.message || "Pergerakan stok berhasil disimpan.");

    setStockForm({
      productId: "",
      jenis: "MASUK",
      jumlah: "1",
      catatan: "",
    });

    await fetchData();
  } catch (err) {
    setError(err.message || "Terjadi kesalahan saat menyimpan stok.");
  } finally {
    setStockSaving(false);
  }
}

  function handleEdit(product) {
  setEditingId(product.id);
  setForm({
    kode: product.kode ?? "",
    nama: product.nama ?? "",
    satuan: product.satuan ?? "pcs",
    hargaBeli: String(product.hargaBeli ?? ""),
    hargaJual: String(product.hargaJual ?? ""),
    stok: String(product.stok ?? 0),
    stokMinimum: String(product.stokMinimum ?? 5),
    categoryId: String(product.categoryId ?? ""),
  });
  setError("");
  setSuccess("");
  setShowForm(true);
  setEditingId(product.id);

  setForm({
    kode: product.kode,
    nama: product.nama,
    satuan: product.satuan,
    hargaBeli: String(product.hargaBeli),
    hargaJual: String(product.hargaJual),
    stok: String(product.stok),
    stokMinimum: String(product.stokMinimum),
    categoryId: String(product.categoryId),
  });
}

const handleExportCSV = async () => {
  try {
    setError("");
    setSuccess("");

    // Ambil data produk yang diarsipkan langsung dari backend
    const response = await fetch(`${API_URL}/products/archived`);

    if (!response.ok) {
      throw new Error("Gagal mengambil data produk arsip.");
    }

    const archivedData = await response.json();

    // Gabungkan produk aktif dan produk yang diarsipkan
    const allProducts = [
      ...products.map((product) => ({
        ...product,
        statusProduk: "Aktif",
      })),
      ...archivedData.map((product) => ({
        ...product,
        statusProduk: "Diarsipkan",
      })),
    ];

    if (allProducts.length === 0) {
      setError("Belum ada produk untuk diekspor.");
      return;
    }

    const headers = [
      "Kode Produk",
      "Nama Produk",
      "Kategori",
      "Harga Jual",
      "Stok",
      "Satuan",
      "Stok Minimum",
      "Status Stok",
      "Status Produk",
    ];

    const rows = allProducts.map((product) => [
      product.kode,
      product.nama,
      product.category?.nama ?? "-",
      product.hargaJual,
      product.stok,
      product.satuan,
      product.stokMinimum,
      product.stok <= product.stokMinimum
        ? "Stok Menipis"
        : "Stok Aman",
      product.statusProduk,
    ]);

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      headers.map(escapeCSV).join(";"),
      ...rows.map((row) => row.map(escapeCSV).join(";")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `laporan-stok-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccess(
      `Berhasil mengekspor ${allProducts.length} produk, termasuk produk arsip.`
    );
  } catch (error) {
    console.error("Gagal mengekspor CSV:", error);
    setError(error.message || "Gagal mengekspor laporan stok.");
  }
};


const handleExportExcel = async () => {
  try {
    setError("");
    setSuccess("");

    const response = await fetch(`${API_URL}/products/archived`);

    if (!response.ok) {
      throw new Error("Gagal mengambil data produk arsip.");
    }

    const archivedData = await response.json();

    const allProducts = [
      ...products.map((product) => ({
        ...product,
        statusProduk: "Aktif",
      })),
      ...archivedData.map((product) => ({
        ...product,
        statusProduk: "Diarsipkan",
      })),
    ];

    if (allProducts.length === 0) {
      setError("Belum ada produk untuk diekspor.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Wr. Tati";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Data Produk");

    // Judul laporan
    worksheet.mergeCells("A1:I1");
    const title = worksheet.getCell("A1");
    title.value = "DATA PRODUK Wr. Tati";
    title.font = {
      name: "Arial",
      size: 16,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    title.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    title.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF123B2A" },
    };
    worksheet.getRow(1).height = 32;

    worksheet.mergeCells("A2:I2");
    worksheet.getCell("A2").value =
      `Laporan Inventaris Wr. Tati | ${new Date().toLocaleDateString("id-ID")}`;
    worksheet.getCell("A2").alignment = {
      horizontal: "center",
    };
    worksheet.getCell("A2").font = {
      italic: true,
      color: { argb: "FF555555" },
    };

    // Header tabel
    const headers = [
      "Kode Produk",
      "Nama Produk",
      "Kategori",
      "Harga Jual",
      "Stok",
      "Satuan",
      "Stok Minimum",
      "Status Stok",
      "Status Produk",
    ];

    worksheet.addRow([]);
    const headerRow = worksheet.addRow(headers);

    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1B543B" },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFB7C9D6" } },
        bottom: { style: "thin", color: { argb: "FFB7C9D6" } },
        left: { style: "thin", color: { argb: "FFB7C9D6" } },
        right: { style: "thin", color: { argb: "FFB7C9D6" } },
      };
    });

    // Data produk
    allProducts.forEach((product, index) => {
      const row = worksheet.addRow([
        product.kode,
        product.nama,
        product.category?.nama ?? "-",
        Number(product.hargaJual) || 0,
        Number(product.stok) || 0,
        product.satuan,
        Number(product.stokMinimum) || 0,
        Number(product.stok) <= Number(product.stokMinimum)
          ? "Stok Menipis"
          : "Stok Aman",
        product.statusProduk,
      ]);

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFD0D7DE" } },
          bottom: { style: "thin", color: { argb: "FFD0D7DE" } },
          left: { style: "thin", color: { argb: "FFD0D7DE" } },
          right: { style: "thin", color: { argb: "FFD0D7DE" } },
        };

        if (index % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEAF2F8" },
          };
        }

        cell.alignment = { vertical: "middle" };
      });

      row.getCell(4).numFmt = '"Rp" #,##0';
      row.getCell(5).alignment = { horizontal: "center" };
      row.getCell(7).alignment = { horizontal: "center" };
      row.getCell(8).alignment = { horizontal: "center" };
      row.getCell(9).alignment = { horizontal: "center" };
    });


    
    // Ringkasan inventaris
    const activeProducts = allProducts.filter(
      (product) => product.statusProduk === "Aktif"
    );

    const activeCount = activeProducts.length;

    const lowStockCount = activeProducts.filter(
      (product) =>
        Number(product.stok) <= Number(product.stokMinimum)
    ).length;

    const totalStockValue = activeProducts.reduce(
      (total, product) =>
        total +
        (Number(product.hargaJual) || 0) *
          (Number(product.stok) || 0),
      0
    );

    
    // Jarak antara tabel produk dan ringkasan
    worksheet.addRow([]);

    // Judul ringkasan dengan lebar lebih pendek
    const summaryTitleRow = worksheet.addRow([
      "RINGKASAN INVENTARIS",
    ]);

    const summaryTitleNumber = summaryTitleRow.number;

    // Lebar judul hanya sampai kolom C
    worksheet.mergeCells(
      `A${summaryTitleNumber}:C${summaryTitleNumber}`
    );

    summaryTitleRow.height = 22;

    const titleCell = worksheet.getCell(`A${summaryTitleNumber}`);

    titleCell.value = "RINGKASAN INVENTARIS";

    titleCell.font = {
      name: "Arial",
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 10,
    };

    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF123B2A" },
    };

    titleCell.alignment = {
      vertical: "middle",
      horizontal: "center",
    };


    // Isi ringkasan
    const summaryRows = [
      ["Total Produk Aktif", activeCount],
      ["Produk dengan Stok Menipis", lowStockCount],
      ["Estimasi Nilai Jual Persediaan", totalStockValue],
    ];

    summaryRows.forEach(([label, value], index) => {
      const row = worksheet.addRow([]);
      const rowNumber = row.number;

      worksheet.mergeCells(`A${rowNumber}:B${rowNumber}`);

      row.height = 24;

      const labelCell = worksheet.getCell(`A${rowNumber}`);
      labelCell.value = label;
      labelCell.font = {
        name: "Arial",
        bold: true,
        size: 10,
      };
      labelCell.alignment = {
        vertical: "middle",
        horizontal: "left",
        indent: 1,
      };

      const valueCell = worksheet.getCell(`C${rowNumber}`);
      valueCell.value = value;
      valueCell.font = {
        name: "Arial",
        bold: true,
        size: 10,
        color: { argb: "FF24547A" },
      };
      valueCell.alignment = {
        vertical: "middle",
        horizontal: "right",
        indent: 1,
      };

      valueCell.numFmt =
        index === 2 ? '"Rp" #,##0' : "#,##0";

      for (let col = 1; col <= 3; col++) {
        const cell = worksheet.getCell(rowNumber, col);

        cell.border = {
          top: { style: "thin", color: { argb: "FFD0D7DE" } },
          bottom: { style: "thin", color: { argb: "FFD0D7DE" } },
          left: { style: "thin", color: { argb: "FFD0D7DE" } },
          right: { style: "thin", color: { argb: "FFD0D7DE" } },
        };

        if (index % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEAF2F8" },
          };
        }
      }
    });

    // Lebar kolom
    worksheet.columns = [
      { width: 18 },
      { width: 28 },
      { width: 22 },
      { width: 18 },
      { width: 12 },
      { width: 14 },
      { width: 18 },
      { width: 18 },
      { width: 20 },
    ];

    // Filter header sampai baris data terakhir
    worksheet.autoFilter = {
      from: "A4",
      to: `I${worksheet.rowCount}`,
    };

    
    // Bekukan header saat menggulir
    worksheet.views = [
      { state: "frozen", ySplit: 4 },
    ];

    // Pengaturan halaman untuk dicetak
    worksheet.pageSetup = {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    };

    // Ulangi baris header pada setiap halaman cetak
    worksheet.pageSetup.printTitlesRow = "1:4";

    // Area yang akan dicetak
    worksheet.pageSetup.printArea = `A1:I${worksheet.rowCount}`;

    worksheet.headerFooter.oddFooter =
  "&Wr. Tati - Laporan Inventaris&RHalaman &P dari &N";

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `laporan-stok-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccess(
      `Berhasil mengekspor ${allProducts.length} produk ke Excel.`
    );
  } catch (error) {
    console.error("Gagal mengekspor Excel:", error);
    setError(error.message || "Gagal mengekspor laporan Excel.");
  }
};


async function handleDelete(product) {
  const confirmed = window.confirm(
    `Yakin ingin menghapus produk "${product.nama}"?`
  );

  if (!confirmed) return;

  setError("");
  setSuccess("");

  try {
    const response = await fetch(
      `${API_URL}/products/${product.id}`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json();

console.log("RESPONS HAPUS:", response.status, data);

if (!response.ok) {
  throw new Error(data.message || "Gagal menghapus produk.");
}

    setSuccess("Produk berhasil dihapus.");
    await fetchData();
  } catch (err) {
    setError(err.message || "Terjadi kesalahan saat menghapus produk.");
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  setError("");
  setSuccess("");

  if (Number(form.hargaBeli) < 0 || Number(form.hargaJual) < 0) {
    setError("Harga tidak boleh bernilai negatif.");
    return;
  }

  if (
    !Number.isInteger(Number(form.stok)) ||
    !Number.isInteger(Number(form.stokMinimum)) ||
    Number(form.stok) < 0 ||
    Number(form.stokMinimum) < 0
  ) {
    setError("Stok dan stok minimum harus berupa bilangan bulat nonnegatif.");
    return;
  }

  try {
    setSaving(true);

    const wasEditing = editingId !== null;

    const response = await fetch(
      wasEditing
        ? `${API_URL}/products/${editingId}`
        : `${API_URL}/products`,
      {
        method: wasEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          kode: form.kode.trim(),
          nama: form.nama.trim(),
          satuan: form.satuan.trim() || "pcs",
          hargaBeli: Number(form.hargaBeli),
          hargaJual: Number(form.hargaJual),
          stok: Number(form.stok),
          stokMinimum: Number(form.stokMinimum),
          categoryId: Number(form.categoryId),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal menyimpan produk.");
    }

    setSuccess(
      wasEditing
        ? "Produk berhasil diperbarui."
        : "Produk berhasil ditambahkan."
    );

    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);

    await fetchData();
  } catch (err) {
    setError(err.message || "Terjadi kesalahan saat menyimpan produk.");
  } finally {
    setSaving(false);
  }
}

const filteredProducts = products.filter((product) => {
  const keyword = searchTerm.trim().toLowerCase();

  const matchesSearch =
    product.nama.toLowerCase().includes(keyword) ||
    product.kode.toLowerCase().includes(keyword) ||
    (product.category?.nama ?? "").toLowerCase().includes(keyword);

  const lowStock = product.stok <= product.stokMinimum;

  const matchesStock =
    stockFilter === "SEMUA" ||
    (stockFilter === "MENIPIS" && lowStock) ||
    (stockFilter === "AMAN" && !lowStock);

  const matchesCategory =
    selectedCategoryId === null ||
    Number(product.categoryId ?? product.category?.id) ===
      Number(selectedCategoryId);

  return matchesSearch && matchesStock && matchesCategory;
});

const lowStockProducts = products.filter(
  (product) => product.stok <= product.stokMinimum
);


// Statistik tambahan Dashboard
const totalStock = products.reduce(
  (total, product) => total + Number(product.stok || 0),
  0
);

const totalInventoryValue = products.reduce(
  (total, product) =>
    total +
    Number(product.hargaBeli || 0) * Number(product.stok || 0),
  0
);

const totalSellingValue = products.reduce(
  (total, product) =>
    total +
    Number(product.hargaJual || 0) * Number(product.stok || 0),
  0
);

const safeStockProducts = products.filter(
  (product) => Number(product.stok) > Number(product.stokMinimum)
);

const stockHealth = products.length > 0
  ? Math.round((safeStockProducts.length / products.length) * 100)
  : 0;

  // STEP 5A: Data grafik stok produk
const stockChartData = [...products]
  .sort((a, b) => Number(b.stok) - Number(a.stok))
  .slice(0, 5);

const maxStock = Math.max(
  ...stockChartData.map((product) => Number(product.stok)),
  1
);

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-800 bg-[#10172A] p-6 text-white md:block">
  <div className="mb-12 flex items-center gap-3">
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-violet-600 text-2xl shadow-lg shadow-blue-500/20">
      📦
    </div>
    <div>
      <h1 className="text-lg font-bold tracking-wide">Wr. Tati</h1>
      <p className="text-xs text-slate-400">Inventory Management</p>
    </div>
  </div>

  <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
    Menu utama
  </p>

  <button
  type="button"
  onClick={() => setActivePage("dashboard")}
  className={`w-full rounded-xl px-4 py-3 text-left font-semibold transition ${
    activePage === "dashboard"
      ? "border border-blue-400/10 bg-linear-to-r from-blue-500/20 to-violet-500/10 text-blue-300 shadow-sm"
      : "text-slate-400 hover:bg-slate-800 hover:text-white"
  }`}
>
  ▦ &nbsp; Dashboard
</button>

<button
  type="button"
  onClick={() => setActivePage("products")}
  className={`mt-3 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
    activePage === "products"
      ? "border border-blue-400/10 bg-linear-to-r from-blue-500/20 to-violet-500/10 font-semibold text-blue-300"
      : "text-slate-400 hover:bg-slate-800 hover:text-white"
  }`}
>
  <span>📦</span>
  <span>Produk</span>
</button>

<button
  type="button"
  onClick={() => setActivePage("categories")}
  className={`mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
    activePage === "categories"
      ? "border border-blue-400/10 bg-linear-to-r from-blue-500/20 to-violet-500/10 font-semibold text-blue-300"
      : "text-slate-400 hover:bg-slate-800 hover:text-white"
  }`}
>
  <span>🗂️</span>
  <span>Kategori</span>
</button>

</aside>

      <main className="min-h-screen md:ml-64">    
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#151E33] px-5 py-6 shadow-lg sm:px-8">
  <div>
    <p className="text-sm text-slate-400">
      Manajemen Toko / Overview
    </p>

    <h2 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
  {activePage === "dashboard"
    ? "Dashboard"
    : activePage === "products"
    ? "Produk"
    : "Kategori"}
</h2>

    <p className="mt-1 text-sm text-slate-400">
      Selamat datang di Wr. Tati Inventory System
    </p>
  </div>

  <button
    onClick={fetchData}
    disabled={loading}
    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 font-semibold text-slate-200 transition hover:border-blue-500 hover:bg-slate-700 disabled:opacity-50"
  >
    {loading ? "Memuat..." : "↻ Refresh"}
  </button>
</header>

        {(activePage === "dashboard" || activePage === "products") && (
  <div className="space-y-6 p-5 sm:p-8">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
            >
              {success}
            </div>
          )}
          {activePage === "dashboard" && (
          <section>
  <h3 className="mb-4 text-lg font-bold">Ringkasan Inventaris</h3>

  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <StatCard
      icon="📦"
      label="Total Produk"
      value={loading ? "..." : products.length}
      description="Jenis produk terdaftar"
      color="emerald"
    />

    <StatCard
      icon="🗂️"
      label="Total Kategori"
      value={loading ? "..." : categories.length}
      description="Kategori produk"
      color="blue"
    />

    <StatCard
      icon="⚠️"
      label="Stok Menipis"
      value={loading ? "..." : lowStockProducts.length}
      description="Produk perlu diperiksa"
      color="amber"
    />

    <StatCard
      icon="📊"
      label="Total Stok"
      value={loading ? "..." : totalStock.toLocaleString("id-ID")}
      description="Jumlah seluruh unit produk"
      color="blue"
    />

    <StatCard
      icon="💰"
      label="Nilai Modal"
      value={
        loading
          ? "..."
          : `Rp ${totalInventoryValue.toLocaleString("id-ID")}`
      }
      description="Estimasi nilai stok berdasarkan harga beli"
      color="emerald"
    />

    <StatCard
      icon="💵"
      label="Potensi Penjualan"
      value={
        loading
          ? "..."
          : `Rp ${totalSellingValue.toLocaleString("id-ID")}`
      }
      description="Estimasi nilai stok berdasarkan harga jual"
      color="amber"
    />

    <StatCard
      icon="❤️"
      label="Kesehatan Stok"
      value={loading ? "..." : `${stockHealth}%`}
      description="Persentase produk dengan stok aman"
      color="emerald"
    />
  </div>
</section>
          )}
{activePage === "dashboard" && (
<section className="rounded-2xl border border-slate-700/70 bg-[#151E33] p-5 shadow-lg shadow-black/10">
  <div className="mb-3 flex items-center justify-between">
    <div>
      <h3 className="font-bold text-white">Kesehatan Stok</h3>
      <p className="text-sm text-slate-400">
        Persentase produk dengan stok di atas batas minimum
      </p>
    </div>

    <span className="text-xl font-bold text-emerald-400">
      {loading ? "..." : `${stockHealth}%`}
    </span>
  </div>

  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
    <div
      className={`h-full rounded-full transition-all duration-500 ${
        stockHealth >= 70
          ? "bg-emerald-500"
          : stockHealth >= 40
          ? "bg-amber-500"
          : "bg-red-500"
      }`}
      style={{ width: `${stockHealth}%` }}
    />
  </div>

  <p className="mt-2 text-xs text-slate-400">
    {loading
      ? "Memuat data..."
      : `${safeStockProducts.length} dari ${products.length} produk memiliki stok aman`}
  </p>
</section>
)}

{activePage === "dashboard" && (
<section className="rounded-2xl border border-slate-700/70 bg-[#151E33] p-5 shadow-lg shadow-black/10">
  <div className="mb-5">
    <h3 className="font-bold text-white">
      Grafik Stok Produk
    </h3>
    <p className="mt-1 text-sm text-slate-400">
      5 produk dengan jumlah stok terbanyak
    </p>
  </div>

  {loading ? (
    <p className="text-sm text-slate-400">Memuat grafik...</p>
  ) : stockChartData.length === 0 ? (
    <p className="text-sm text-slate-400">Belum ada data produk untuk ditampilkan.\</p>
  ) : (
    <div className="space-y-5">
      {stockChartData.map((product) => {
        const stok = Number(product.stok) || 0;
        const percentage = (stok / maxStock) * 100;

        return (
          <div key={product.id}>
           <div className="mb-2 flex justify-between gap-3 text-sm">
              <span className="font-medium text-slate-300">
                {product.nama}
              </span>
              <span className="font-bold text-white">
                {stok} {product.satuan}
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-linear-to-r from-blue-500 to-violet-500 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  )}
</section>
)}

{activePage === "dashboard" && (
          <section className="rounded-2xl border border-slate-700/70 bg-[#151E33] p-5 shadow-lg shadow-black/10 sm:p-6">
            <div>
              <h3 className="text-lg font-bold text-white">Pergerakan Stok</h3>
              <p className="mt-1 text-sm text-slate-400">
                Catat penambahan atau pengurangan stok produk.
              </p>
            </div>

            <form
              onSubmit={handleStockSubmit}
              className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <FormField label="Pilih Produk" required>
                <select
                  name="productId"
                  value={stockForm.productId}
                  onChange={handleStockChange}
                  required
                  className={inputClass}
                >
                  <option value="">Pilih produk</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.kode} - {product.nama} (Stok: {product.stok})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Jenis Pergerakan" required>
                <select
                  name="jenis"
                  value={stockForm.jenis}
                  onChange={handleStockChange}
                  required
                  className={inputClass}
                >
                  <option value="MASUK">Stok Masuk</option>
                  <option value="KELUAR">Stok Keluar</option>
                </select>
              </FormField>

              <FormField label="Jumlah" required>
                <input
                  name="jumlah"
                  type="number"
                  min="1"
                  step="1"
                  value={stockForm.jumlah}
                  onChange={handleStockChange}
                  required
                  className={inputClass}
                />
              </FormField>

              <FormField label="Catatan">
                <input
                  name="catatan"
                  value={stockForm.catatan}
                  onChange={handleStockChange}
                  maxLength={255}
                  placeholder="Contoh: Pembelian barang"
                  className={inputClass}
                />
              </FormField>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={stockSaving || products.length === 0}
                  className="rounded-xl bg-linear-to-r from-blue-600 to-violet-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {stockSaving ? "Menyimpan..." : "Simpan Pergerakan Stok"}
                </button>
              </div>
            </form>
          </section>
            )}

          {activePage === "products" && (
          <section className="rounded-2xl border border-slate-700/70 bg-[#151E33] p-5 shadow-lg shadow-black/10 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">Daftar Produk</h3>
                <div className="mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama, kode, atau kategori produk..."
                  className="w-full rounded-xl border border-slate-700 bg-[#0B1120] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
                <div className="mb-4">
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className={inputClass}
                >
                  <option value="SEMUA">Semua Status Stok</option>
                  <option value="AMAN">Stok Aman</option>
                  <option value="MENIPIS">Stok Menipis</option>
                </select>
              </div>
              </div>
                <p className="mt-1 text-sm text-slate-400">Kelola inventaris toko kamu.</p>
              </div>

              
<div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ekspor CSV
            </button>
            
<button
  type="button"
  onClick={handleExportExcel}
  className="rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-700"
>
  Ekspor Excel
</button>

<button
  type="button"
  onClick={async () => {
    setError("");
    setSuccess("");

    if (!showArchived) {
      await fetchArchivedProducts();
    }

    setShowArchived(!showArchived);
  }}
  className="rounded-xl bg-purple-600 px-4 py-2.5 font-semibold text-white transition hover:bg-purple-700"
>
  {showArchived ? "Tutup Arsip" : "Produk Diarsipkan"}
</button>
            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
                setShowForm(!showForm);
              }}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-700"
            >
              {showForm ? "Tutup Form" : "+ Tambah Produk"}
            </button>
          </div>
            </div>

            {showArchived && (
  <div className="mb-6 overflow-hidden rounded-2xl border border-slate-700/70 bg-[#151E33] shadow-lg shadow-black/10">
    <div className="flex items-center justify-between border-b border-slate-700 bg-[#10172A] px-5 py-4">
      <div>
        <h3 className="text-lg font-bold text-white">
          Produk Diarsipkan
        </h3>
        <p className="text-sm text-slate-400">
          Produk yang diarsipkan tetap tersimpan di database.
        </p>
      </div>

      <span className="rounded-full bg-purple-500/15 px-3 py-1 text-sm font-semibold text-purple-300 ring-1 ring-purple-500/20">
        {archivedProducts.length} produk
      </span>
    </div>

    {archivedProducts.length === 0 ? (
      <p className="px-5 py-8 text-center text-slate-400">
        Belum ada produk yang diarsipkan.
      </p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#10172A] text-slate-400">
            <tr>
              <th className="px-5 py-3">Kode</th>
              <th className="px-5 py-3">Nama Produk</th>
              <th className="px-5 py-3">Kategori</th>
              <th className="px-5 py-3">Stok</th>
              <th className="px-5 py-3">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-700/60">
            {archivedProducts.map((product) => (
              <tr key={product.id} className="transition-colors hover:bg-slate-800/70">
                <td className="px-5 py-3 text-slate-300">{product.kode}</td>
                <td className="px-5 py-3 font-medium text-white">
                  {product.nama}
                </td>
                <td className="px-5 py-3 text-slate-300">
                  {product.category?.nama ?? "-"}
                </td>
                <td className="px-5 py-3 text-slate-300">
                  {product.stok} {product.satuan}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestoreProduct(product.id)}
                      className="rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Pulihkan
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePermanentDeleteProduct(product)}
                      className="rounded-lg bg-red-600 px-3 py-2 font-semibold text-white transition hover:bg-red-700"
                    >
                      Hapus Permanen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}

            {showForm && (
              <form
                onSubmit={handleSubmit}
                className="mt-6 rounded-2xl border border-slate-700/70 bg-[#151E33] p-5 text-white shadow-lg shadow-black/10 sm:p-6"
              >
                <h4 className="mb-5 text-base font-bold text-white">
                  {editingId !== null ? "Edit Produk" : "Form Produk Baru"}
                </h4>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FormField label="Kode Produk" required>
                    <input
                      name="kode"
                      value={form.kode}
                      onChange={handleChange}
                      placeholder="Contoh: P1"
                      maxLength={50}
                      required
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Nama Produk" required>
                    <input
                      name="nama"
                      value={form.nama}
                      onChange={handleChange}
                      placeholder="Contoh: Mi Instan"
                      maxLength={150}
                      required
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Kategori" required>
                    <select
                      name="categoryId"
                      value={form.categoryId}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    >
                      <option value="">Pilih kategori</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.nama}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Satuan" required>
                    <input
                      name="satuan"
                      value={form.satuan}
                      onChange={handleChange}
                      placeholder="pcs, botol, bungkus..."
                      maxLength={30}
                      required
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Harga Beli (Rp)" required>
                    <input
                      name="hargaBeli"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.hargaBeli}
                      onChange={handleChange}
                      placeholder="2500"
                      required
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Harga Jual (Rp)" required>
                    <input
                      name="hargaJual"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.hargaJual}
                      onChange={handleChange}
                      placeholder="3500"
                      required
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Stok Awal" required>
                    <input
                      name="stok"
                      type="number"
                      min="0"
                      step="1"
                      value={form.stok}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </FormField>

                  <FormField label="Stok Minimum" required>
                    <input
                      name="stokMinimum"
                      type="number"
                      min="0"
                      step="1"
                      value={form.stokMinimum}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </FormField>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setForm(initialForm);
                      setError("");
                    }}
                    className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 font-semibold text-slate-200 transition hover:bg-slate-700"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={saving || categories.length === 0}
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                    ? "Menyimpan..."
                    : editingId !== null
                    ? "Simpan Perubahan"
                    : "Simpan Produk"}
                  </button>
                </div>

                {categories.length === 0 && (
                  <p className="mt-3 text-sm text-amber-300">
                    Belum ada kategori. Tambahkan kategori terlebih dahulu.
                  </p>
                )}
              </form>
            )}

            <div className="mt-6">
              {loading ? (
                <p className="py-10 text-center text-slate-500">
                  Memuat data produk...
                </p>
              ) : products.length === 0 ? (
                <p className="py-10 text-center text-slate-500">
                  Belum ada produk yang terdaftar.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-700px text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 bg-[#10172A] text-slate-400">
                        <th className="px-3 py-3 font-semibold">Produk</th>
                        <th className="px-3 py-3 font-semibold">Kategori</th>
                        <th className="px-3 py-3 font-semibold">Harga Jual</th>
                        <th className="px-3 py-3 font-semibold">Stok</th>
                        <th className="px-3 py-3 font-semibold">Status</th>
                        <th className="px-3 py-3 font-semibold">Aksi</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredProducts.map((product) => {
                        const lowStock =
                          product.stok <= product.stokMinimum;

                        return (
                          <tr
                            key={product.id}
                            className="border-b border-slate-700/60 transition-colors hover:bg-slate-800/70 last:border-0"
                          >
                            <td className="px-3 py-4">
                              <p className="font-semibold text-white">
                                {product.nama}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {product.kode}
                              </p>
                            </td>
                            <td className="px-3 py-4 text-slate-300">
                              {product.category?.nama ?? "-"}
                            </td>
                            <td className="px-3 py-4 font-medium text-slate-200">
                              {formatRupiah(product.hargaJual)}
                            </td>
                            <td className="px-3 py-4 text-slate-300">
                              {product.stok} {product.satuan}
                            </td>
                            <td className="px-3 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  lowStock
                                    ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20"
                                    : "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20"
                                }`}
                              >
                                {lowStock ? "Stok Menipis" : "Stok Aman"}
                              </span>
                            </td>
                            
                              <td className="px-3 py-4">
                              <button
                                type="button"
                                onClick={() => handleEdit(product)}
                                className="rounded-lg border border-blue-500/30 bg-blue-500/15 px-3 py-1.5 font-medium text-blue-400 transition hover:bg-blue-500/25"
                              >
                                Edit
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => handleDelete(product)}
                                className="ml-2 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-1.5 font-medium text-red-400 transition hover:bg-red-500/25"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
          )}
          
          {activePage === "dashboard" && (
          <section className="rounded-2xl border border-slate-700/70 bg-[#151E33] p-5 shadow-lg shadow-black/10 sm:p-6">
            <h3 className="text-lg font-bold text-white">Riwayat Pergerakan Stok</h3>
            <p className="mt-1 text-sm text-slate-400">
              Catatan transaksi stok masuk dan keluar.
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-650px text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-[#10172A] text-slate-400">
                    <th className="px-3 py-3 font-semibold">Tanggal</th>
                    <th className="px-3 py-3 font-semibold">Produk</th>
                    <th className="px-3 py-3 font-semibold">Jenis</th>
                    <th className="px-3 py-3 font-semibold">Jumlah</th>
                    <th className="px-3 py-3 font-semibold">Catatan</th>
                  </tr>
                </thead>

                <tbody>
                  {stockLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Memuat riwayat stok...
                      </td>
                    </tr>
                  ) : stockMovements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Belum ada riwayat pergerakan stok.
                      </td>
                    </tr>
                  ) : (
                    stockMovements.map((movement) => (
                      <tr
                        key={movement.id}
                        className="border-b border-slate-700/60 transition-colors hover:bg-slate-800/70 last:border-0"
                      >
                        <td className="px-3 py-4 text-slate-300">
                          {new Date(movement.tanggal).toLocaleString("id-ID")}
                        </td>
                        <td className="px-3 py-4">
                          <p className="font-semibold text-white">{movement.product?.nama ?? "-"}</p>
                          <p className="text-xs text-slate-400">
                            {movement.product?.kode ?? "-"}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              movement.jenis === "MASUK"
                                ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20"
                                : "bg-red-500/15 text-red-400 ring-1 ring-red-500/20"
                            }`}
                          >
                            {movement.jenis === "MASUK" ? "Stok Masuk" : "Stok Keluar"}
                          </span>
                        </td>
                        <td className="px-3 py-4 font-medium text-slate-200">
                          {movement.jumlah} {movement.product?.satuan ?? ""}
                        </td>
                        <td className="px-3 py-4 text-slate-300">
                          {movement.catatan || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
          )}

          {activePage === "dashboard" && lowStockProducts.length > 0 && (
  <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h3 className="font-bold text-amber-900">
          ⚠️ Perhatian: Stok Menipis
        </h3>
        <p className="mt-1 text-sm text-amber-700">
          {lowStockProducts.length} produk perlu segera diperiksa.
        </p>
      </div>

      <span className="rounded-full bg-amber-200 px-3 py-1 text-sm font-bold text-amber-900">
        {lowStockProducts.length} Produk
      </span>
    </div>

    <div className="space-y-3">
      {[...lowStockProducts]
        .sort((a, b) => Number(a.stok) - Number(b.stok))
        .map((product) => {
          const stok = Number(product.stok);
          const minimum = Number(product.stokMinimum);

          const status =
            stok <= 0
              ? "Habis"
              : stok <= minimum * 0.5
              ? "Kritis"
              : "Menipis";

          const statusColor =
            status === "Habis"
              ? "bg-red-100 text-red-700"
              : status === "Kritis"
              ? "bg-orange-100 text-orange-700"
              : "bg-amber-200 text-amber-800";

          return (
            <div
              key={product.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-3"
            >
              <div>
                <p className="font-semibold text-gray-800">
                  {product.nama}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Sisa {product.stok} {product.satuan} · Minimum{" "}
                  {product.stokMinimum}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${statusColor}`}
              >
                {status}
              </span>
            </div>
          );
        })}
    </div>
  </section>
)}

        </div>
        )}

        {activePage === "categories" && (
          <div className="space-y-6 p-5 sm:p-8">
            <section className="rounded-2xl border border-slate-700/70 bg-[#151E33] p-5 shadow-lg shadow-black/10 sm:p-6">
              <div className="mb-5">
                <h3 className="text-lg font-bold text-white">
                  Manajemen Kategori
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Daftar kategori produk yang tersedia di SmartStock.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {categories.map((category) => {
                  const totalProduk = products.filter(
                    (product) =>
                      Number(product.categoryId) === Number(category.id) ||
                      Number(product.category?.id) === Number(category.id)
                  ).length;

                  return (
                    <button
  key={category.id}
  type="button"
  onClick={() => {
    setSelectedCategoryId(category.id);
    setActivePage("products");
  }}
  className="w-full rounded-2xl border border-slate-700 bg-[#10172A] p-5 text-left transition hover:border-blue-500 hover:bg-[#192642] hover:shadow-lg hover:shadow-blue-500/10"
>
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-2xl">
                        🗂️
                      </div>

                      <h4 className="font-bold text-white">
                        {category.nama}
                      </h4>

                      <p className="mt-2 text-sm text-slate-400">
                        {totalProduk} produk terdaftar
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-600 bg-[#10172A] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10";
function FormField({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function StatCard({ icon, label, value, description, color }) {
  const colorClasses = {
    emerald:
      "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20",
    blue:
      "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/20",
    amber:
      "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20",
  };

  return (
    <div className="group rounded-2xl border border-slate-700/70 bg-[#151E33] p-6 shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-950/30">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-400">
            {label}
          </p>

          <p className="mt-3 wrap-break-words text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl transition-transform duration-300 group-hover:scale-110 ${
            colorClasses[color] || colorClasses.blue
          }`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full w-1/3 rounded-full transition-all duration-500 group-hover:w-2/3 ${
            color === "emerald"
              ? "bg-emerald-500"
              : color === "amber"
              ? "bg-amber-500"
              : "bg-blue-500"
          }`}
        />
      </div>
    </div>
  );
}

export default App;
