
const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

// GET: mengambil semua kategori
router.get("/", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: "asc" },
    });

    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Gagal mengambil data kategori." });
  }
});

// POST: menambahkan kategori
router.post("/", async (req, res) => {
  try {
    const { nama } = req.body;

    if (!nama || !nama.trim()) {
      return res.status(400).json({
        message: "Nama kategori wajib diisi.",
      });
    }

    const category = await prisma.category.create({
      data: { nama: nama.trim() },
    });

    res.status(201).json({
      message: "Kategori berhasil ditambahkan.",
      data: category,
    });
  } catch (error) {
    console.error(error);

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Nama kategori sudah digunakan.",
      });
    }

    res.status(500).json({ message: "Gagal menambahkan kategori." });
  }
});

module.exports = router;
