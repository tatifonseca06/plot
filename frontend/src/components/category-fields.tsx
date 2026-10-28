"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";

type Category = {
  name: string;
  subcategories: { id: string; name: string }[];
};

export default function CategoryFields({
  prefix,
  initialCategory = "",
  initialSubcategoryId = "",
}: {
  prefix: string;
  initialCategory?: string;
  initialSubcategoryId?: string | null;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState(initialCategory);
  const [subcategoryId, setSubcategoryId] = useState(initialSubcategoryId ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    api<{ items: Category[] }>("/categories")
      .then(({ items }) => {
        if (active) setCategories(items);
      })
      .catch((failure) => {
        if (active) setError(errorMessage(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [revision]);

  const selected = categories.find((item) => item.name === category);
  const subcategories = selected?.subcategories ?? [];

  return <>
    <label htmlFor={`${prefix}-category`}>Categoría</label>
    <select
      id={`${prefix}-category`}
      name="category"
      required
      value={selected ? category : ""}
      aria-busy={loading}
      onChange={(event) => {
        setCategory(event.target.value);
        setSubcategoryId("");
      }}
    >
      <option value="">{loading ? "Cargando categorías…" : "Selecciona una categoría"}</option>
      {categories.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
    </select>
    <label htmlFor={`${prefix}-subcategory`}>Subcategoría</label>
    <select
      id={`${prefix}-subcategory`}
      name="subcategoryId"
      required
      disabled={!selected}
      value={subcategories.some((item) => item.id === subcategoryId) ? subcategoryId : ""}
      onChange={(event) => setSubcategoryId(event.target.value)}
    >
      <option value="">{selected ? "Selecciona una subcategoría" : "Primero selecciona una categoría"}</option>
      {subcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
    {error && <p role="alert">{error} <button type="button" onClick={() => {
      setError("");
      setLoading(true);
      setRevision((value) => value + 1);
    }}>Reintentar</button></p>}
    {!loading && !error && categories.length === 0 && <p role="status">No hay categorías disponibles.</p>}
  </>;
}
