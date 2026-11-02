
const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

// GET: mengambil semua produk
router.get("/", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { aktif: true },
      include: { category: true },
      orderBy: { id: "desc" },
    });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil data produk." });
  }
});

// POST: menambahkan produk
router.post("/", async (req, res) => {
  try {
    const {
      kode,
      nama,
      satuan,
      hargaBeli,
      hargaJual,
      stok,
      stokMinimum,
      categoryId,
    } = req.body;

    if (
      !kode ||
      !nama ||
      hargaBeli == null ||
      hargaJual == null ||
      categoryId == null
    ) {
      return res.status(400).json({
        message:
          "Kode, nama, harga beli, harga jual, dan kategori wajib diisi.",
      });
    }

    const product = await prisma.product.create({
      data: {
        kode,
        nama,
        satuan: satuan || "pcs",
        hargaBeli,
        hargaJual,
        stok: Number(stok ?? 0),
        stokMinimum: Number(stokMinimum ?? 5),
        categoryId: Number(categoryId),
      },
    });

    res.status(201).json({
      message: "Produk berhasil ditambahkan.",
      data: product,
    });
  } catch (error) {
    console.error(error);

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Kode produk sudah digunakan.",
      });
    }

    if (error.code === "P2003" || error.code === "P2025") {
      return res.status(400).json({
        message: "Kategori yang dipilih tidak ditemukan.",
      });
    }

    res.status(500).json({ message: "Gagal menambahkan produk." });
  }
});

// PUT: mengedit produk berdasarkan ID
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "ID produk tidak valid.",
      });
    }

    const {
      kode,
      nama,
      satuan,
      hargaBeli,
      hargaJual,
      stok,
      stokMinimum,
      categoryId,
    } = req.body;

    const data = {};

    if (kode !== undefined) {
      if (typeof kode !== "string" || !kode.trim()) {
        return res.status(400).json({
          message: "Kode produk tidak boleh kosong.",
        });
      }
      data.kode = kode.trim();
    }

    if (nama !== undefined) {
      if (typeof nama !== "string" || !nama.trim()) {
        return res.status(400).json({
          message: "Nama produk tidak boleh kosong.",
        });
      }
      data.nama = nama.trim();
    }

    if (satuan !== undefined) {
      if (typeof satuan !== "string" || !satuan.trim()) {
        return res.status(400).json({
          message: "Satuan tidak boleh kosong.",
        });
      }
      data.satuan = satuan.trim();
    }

    for (const field of ["hargaBeli", "hargaJual"]) {
      if (req.body[field] !== undefined) {
        const value = Number(req.body[field]);

        if (!Number.isFinite(value) || value < 0) {
          return res.status(400).json({
            message: `${field} harus berupa angka nonnegatif.`,
          });
        }

        data[field] = value;
      }
    }

    for (const field of ["stok", "stokMinimum"]) {
      if (req.body[field] !== undefined) {
        const value = Number(req.body[field]);

        if (!Number.isInteger(value) || value < 0) {
          return res.status(400).json({
            message: `${field} harus berupa bilangan bulat nonnegatif.`,
          });
        }

        data[field] = value;
      }
    }

    if (categoryId !== undefined) {
      const value = Number(categoryId);

      if (!Number.isInteger(value) || value <= 0) {
        return res.status(400).json({
          message: "Kategori tidak valid.",
        });
      }

      data.categoryId = value;
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: { category: true },
    });

    res.json({
      message: "Produk berhasil diperbarui.",
      data: product,
    });
  } catch (error) {
    console.error(error);

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Kode produk sudah digunakan.",
      });
    }

    if (error.code === "P2003") {
      return res.status(400).json({
        message: "Kategori yang dipilih tidak ditemukan.",
      });
    }

    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Produk tidak ditemukan.",
      });
    }

    res.status(500).json({
      message: "Gagal memperbarui produk.",
    });
  }
});

// GET: mengambil semua produk yang diarsipkan
router.get("/archived", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { aktif: false },
      include: { category: true },
      orderBy: { id: "desc" },
    });

    res.json(products);
  } catch (error) {
    console.error("Gagal mengambil produk arsip:", error);

    res.status(500).json({
      message: "Gagal mengambil produk yang diarsipkan.",
    });
  }
});

// PATCH: memulihkan produk yang diarsipkan
router.patch("/:id/restore", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "ID produk tidak valid.",
      });
    }

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        message: "Produk tidak ditemukan.",
      });
    }

    if (product.aktif) {
      return res.status(400).json({
        message: "Produk sudah aktif.",
      });
    }

    const restoredProduct = await prisma.product.update({
      where: { id },
      data: { aktif: true },
      include: { category: true },
    });

    res.json({
      message: "Produk berhasil dipulihkan.",
      data: restoredProduct,
    });
  } catch (error) {
    console.error("Gagal memulihkan produk:", error);

    res.status(500).json({
      message: "Gagal memulihkan produk.",
    });
  }
}); 

 // DELETE: mengarsipkan produk agar riwayat stok tetap aman
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "ID produk tidak valid.",
      });
    }

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        message: "Produk tidak ditemukan.",
      });
    }

    if (!product.aktif) {
      return res.status(400).json({
        message: "Produk sudah diarsipkan.",
      });
    }

    await prisma.product.update({
      where: { id },
      data: { aktif: false },
    });

    res.json({
      message: "Produk berhasil diarsipkan.",
    });
  } catch (error) {
    console.error("Gagal mengarsipkan produk:", error);

    res.status(500).json({
      message: "Gagal mengarsipkan produk.",
    });
  }
});

// DELETE PERMANEN: menghapus produk beserta riwayat pergerakan stok
router.delete("/:id/permanent", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "ID produk tidak valid.",
      });
    }

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        message: "Produk tidak ditemukan.",
      });
    }

    if (product.aktif) {
      return res.status(400).json({
        message: "Arsipkan produk terlebih dahulu sebelum menghapus permanen.",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockMovement.deleteMany({
        where: { productId: id },
      });

      await tx.product.delete({
        where: { id },
      });
    });

    res.json({
      message: "Produk dan seluruh riwayat stok berhasil dihapus permanen.",
    });
  } catch (error) {
    console.error("Gagal menghapus produk permanen:", error);

    res.status(500).json({
      message: "Gagal menghapus produk permanen.",
    });
  }
});

  module.exports = router;