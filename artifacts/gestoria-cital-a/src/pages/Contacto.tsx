export default function ContactoPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-6">Contacto</h1>

      <p className="mb-4">
        Si tienes cualquier duda sobre nuestros servicios, puedes escribirnos
        por correo electrónico.
      </p>

      <p className="mb-8">
        <strong>Email:</strong>{" "}
        <a
          href="mailto:jobs@gestoriacitaia.com"
          className="text-blue-600 underline"
        >
          jobs@gestoriacitaia.com
        </a>
      </p>

      <p>
        También puedes visitar nuestra web:
      </p>

      <a
        href="https://www.gestoriacitaia.com"
        className="text-blue-600 underline"
      >
        https://www.gestoriacitaia.com
      </a>
    </main>
  );
}
