import Link from "next/link";

export default function AdminPage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Panel Admin</h1>
      <nav className="no-print" style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link href="/admin/users" style={{ color: "#0066cc" }}>
          Usuarios
        </Link>
        <Link href="/admin/products" style={{ color: "#0066cc" }}>
          Productos
        </Link>
        <Link href="/admin/stock" style={{ color: "#0066cc" }}>
          Stock
        </Link>
        <Link href="/admin/reports" style={{ color: "#0066cc" }}>
          Reportes
        </Link>
        <a href="/api/v1/auth/logout" style={{ color: "#333" }}>
          Cerrar sesión
        </a>
      </nav>
    </main>
  );
}
