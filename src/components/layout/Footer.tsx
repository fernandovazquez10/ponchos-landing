import Image from "next/image";


export default function Footer(){
    return (
        <footer className="bg-dark-navy text-brand-cream py-10 px-6">
          <div className="mx-auto max-w-5xl flex flex-col items-center gap-6 md:flex-row md:justify-between md:items-center">
            <Image
              src="/logo_footer.svg"
              alt="Ponchos Tech Logo"
              width={150}
              height={50}
              loading="eager"
              className="h-auto w-auto"
            />
            <nav className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
              <a href="/" className="transition-colors hover:text-brand-teal">Inicio</a>
              <a href="/servicios" className="transition-colors hover:text-brand-teal">Servicios</a>
              <a href="/nosotros" className="transition-colors hover:text-brand-teal">Nosotros</a>
            </nav>
            <span className="text-sm">&copy; {new Date().getFullYear()} My Company. All rights reserved.</span>
          </div>
        </footer>
    )
}