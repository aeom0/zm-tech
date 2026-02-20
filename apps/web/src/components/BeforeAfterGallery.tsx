"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface GalleryItem {
  category: string;
  label: string;
  placeholder: string;
}

const categories = ["Todos", "Pestañas", "Uñas", "Cejas", "Microblading"];

const galleryItems: GalleryItem[] = [
  {
    category: "Pestañas",
    label: "Extensiones Volumen Ruso",
    placeholder: "pestanas-volumen",
  },
  {
    category: "Pestañas",
    label: "Lifting + Tinturado",
    placeholder: "pestanas-lifting",
  },
  {
    category: "Uñas",
    label: "Uñas en Gel Diseño",
    placeholder: "unas-gel",
  },
  {
    category: "Uñas",
    label: "Manicure Ruso",
    placeholder: "unas-manicure",
  },
  {
    category: "Cejas",
    label: "Laminado de Cejas",
    placeholder: "cejas-laminado",
  },
  {
    category: "Microblading",
    label: "Microblading Cejas",
    placeholder: "microblading-cejas",
  },
];

export function BeforeAfterGallery() {
  const [activeCategory, setActiveCategory] = useState("Todos");

  const filtered =
    activeCategory === "Todos"
      ? galleryItems
      : galleryItems.filter((item) => item.category === activeCategory);

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat
                ? "bg-primary text-white shadow-md"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Gallery grid */}
      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((item) => (
            <motion.div
              key={item.placeholder}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
            >
              {/* Placeholder image area */}
              <div className="aspect-[4/3] bg-gradient-to-br from-primary/10 via-primaryLight/30 to-accent/10 flex items-center justify-center relative overflow-hidden">
                <div className="text-center px-4">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-primary/60"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-primary/60 font-medium">
                    {/* TODO: Reemplazar con foto real */}
                    Foto: {item.label}
                  </p>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <p className="text-white font-semibold text-lg px-4 text-center">
                    {item.label}
                  </p>
                </div>
              </div>

              {/* Label */}
              <div className="p-4">
                <span className="text-xs font-medium text-accent uppercase tracking-wider">
                  {item.category}
                </span>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
                  {item.label}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
