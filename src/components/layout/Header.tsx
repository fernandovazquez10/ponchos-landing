import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-dark-navy">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
        <Link href="/" className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-dark-navy rounded">
            <span className="sr-only">Ponchos Tech</span>
        </Link>

        <ul className="flex items-center gap-6 font-body text-sm text-brand-cream">
          <li>
            <Link
              href="/"
              className="transition-colors hover:text-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-dark-navy rounded"
            >
              Inicio
            </Link>
          </li>
          <li>
            <Link
              href="/servicios"
              className="transition-colors hover:text-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-dark-navy rounded"
            >
              Servicios
            </Link>
          </li>
          <li>
            <Link
              href="/nosotros"
              className="transition-colors hover:text-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-dark-navy rounded"
            >
              Nosotros
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
