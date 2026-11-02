
const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

// GET: melihat riwayat pergerakan stok
router.get("/", async (req, res) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      include: {
        product: {
          select: {
            id: true,
            kode: true,
            nama: true,
            satuan: true,
          },
        },
      },
      orderBy: { tanggal: "desc" },
    });

    res.json(movements);
  } catch (error) {
    console.error("Gagal mengambil riwayat stok:", error);
    res.status(500).json({
      message: "Gagal mengambil riwayat pergerakan stok.",
    });
  }
});

// POST: mencatat stok masuk atau keluar
router.post("/", async (req, res) => {
  try {
    const { productId, jenis, jumlah, catatan } = req.body;

    const id = Number(productId);
    const qty = Number(jumlah);
    const tipe = String(jenis || "").toUpperCase();

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Produk yang dipilih tidak valid.",
      });
    }

    if (!["MASUK", "KELUAR"].includes(tipe)) {
      return res.status(400).json({
        message: "Jenis stok harus MASUK atau KELUAR.",
      });
    }

    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({
        message: "Jumlah stok harus bilangan bulat lebih dari 0.",
      });
    }

    if (
      catatan != null &&
      (typeof catatan !== "string" || catatan.length > 255)
    ) {
      return res.status(400).json({
        message: "Catatan maksimal 255 karakter.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id },
      });

      if (!product) {
        const error = new Error("Produk tidak ditemukan.");
        error.statusCode = 404;
        throw error;
      }

      if (tipe === "KELUAR" && product.stok < qty) {
        const error = new Error(
          `Stok tidak mencukupi. Stok tersedia: ${product.stok}.`
        );
        error.statusCode = 400;
        throw error;
      }

      const perubahan = tipe === "MASUK" ? qty : -qty;

      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          stok: { increment: perubahan },
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId: id,
          jenis: tipe,
          jumlah: qty,
          catatan: catatan?.trim() || null,
        },
        include: {
          product: {
            select: {
              id: true,
              kode: true,
              nama: true,
              satuan: true,
            },
          },
        },
      });

      return { updatedProduct, movement };
    });

    res.status(201).json({
      message:
        tipe === "MASUK"
          ? "Stok masuk berhasil dicatat."
          : "Stok keluar berhasil dicatat.",
      data: {
        stokSekarang: result.updatedProduct.stok,
        pergerakan: result.movement,
      },
    });
  } catch (error) {
    console.error("Gagal mencatat pergerakan stok:", error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    res.status(500).json({
      message: "Gagal mencatat pergerakan stok.",
    });
  }
});

module.exports = router;
