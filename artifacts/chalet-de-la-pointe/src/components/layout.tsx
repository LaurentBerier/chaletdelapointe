import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navLinks = [
  { href: "/", label: "Accueil" },
  { href: "/chalet", label: "Le Chalet" },
  { href: "/calendrier", label: "Calendrier" },
  { href: "/blogue", label: "Blogue" },
  { href: "/contact", label: "Contact" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const isHome = location === "/";
  const isAuthPage = location === "/connexion" || location === "/inscription";
  const isDashboard = location === "/tableau-de-bord";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  const headerTransparent = isHome && !isScrolled && !mobileMenuOpen;
  const textColor = headerTransparent ? "text-white" : "text-foreground";
  const mutedColor = headerTransparent ? "text-white/70 hover:text-white" : "text-foreground/70 hover:text-foreground";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled || !isHome
            ? "bg-background/90 backdrop-blur-md shadow-sm py-4 border-b border-border/50"
            : "bg-transparent py-6"
        }`}
      >
        <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
          <Link
            href="/"
            className={`text-2xl font-serif tracking-tight font-medium transition-colors ${textColor}`}
            data-testid="link-logo"
          >
            ChaletDeLaPointe
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm tracking-wide uppercase transition-colors hover:opacity-100 ${
                  location === link.href
                    ? `${headerTransparent ? "text-white" : "text-primary"} opacity-100 font-medium`
                    : mutedColor
                }`}
                data-testid={`link-nav-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {link.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <Link
                href="/tableau-de-bord"
                className={`flex items-center gap-1.5 text-sm tracking-wide uppercase transition-colors ${
                  isDashboard
                    ? `${headerTransparent ? "text-white" : "text-primary"} font-medium`
                    : mutedColor
                }`}
                data-testid="link-nav-dashboard"
              >
                <User size={14} />
                {user?.name}
              </Link>
            ) : (
              <Link
                href="/connexion"
                className={`text-sm tracking-widest uppercase border px-5 py-2 transition-colors ${
                  headerTransparent
                    ? "border-white/60 text-white hover:bg-white hover:text-primary"
                    : "border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                }`}
                data-testid="link-nav-connexion"
              >
                Mon espace
              </Link>
            )}
          </nav>

          {/* Mobile toggle */}
          <button
            className={`md:hidden p-2 -mr-2 transition-colors ${headerTransparent ? "text-white" : "text-foreground"}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-background pt-24 px-6 pb-6 flex flex-col md:hidden"
          >
            <nav className="flex flex-col gap-6 mt-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-2xl font-serif transition-colors ${
                    location === link.href ? "text-primary" : "text-foreground/80"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-border pt-6 mt-2">
                {isAuthenticated ? (
                  <Link href="/tableau-de-bord" className="text-2xl font-serif text-primary">
                    Mon espace
                  </Link>
                ) : (
                  <Link href="/connexion" className="text-2xl font-serif text-foreground/80">
                    Connexion
                  </Link>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full flex flex-col">
        {children}
      </main>

      {!isDashboard && (
        <footer className="bg-primary text-primary-foreground py-12 md:py-16 mt-auto">
          <div className="container mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <h3 className="font-serif text-xl mb-4">Chalet St-Mathieu</h3>
              <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-xs">
                Une retraite rustique sur le Lac Saint-Mathieu dans les collines boisées du Québec. L'expérience d'un confort chaleureux où la nature a toute sa place.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-sm tracking-wider uppercase">Contact</h4>
              <address className="not-italic text-sm text-primary-foreground/70 flex flex-col gap-2">
                <p>Saint-Mathieu-de-Rioux</p>
                <p>Bas-Saint-Laurent, Québec</p>
                <p>Canada</p>
                <p className="mt-2">bonjour@chaletdelapointe.ca</p>
              </address>
            </div>
            <div>
              <h4 className="font-medium mb-4 text-sm tracking-wider uppercase">Navigation</h4>
              <div className="flex flex-col gap-2 text-sm text-primary-foreground/70">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="hover:text-white transition-colors w-fit">
                    {link.label}
                  </Link>
                ))}
                {isAuthenticated && (
                  <Link href="/tableau-de-bord" className="hover:text-white transition-colors w-fit">
                    Mon espace
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="container mx-auto px-6 md:px-12 mt-12 pt-8 border-t border-primary-foreground/10 text-xs text-primary-foreground/50 text-center md:text-left">
            &copy; {new Date().getFullYear()} ChaletDeLaPointe. Tous droits réservés.
          </div>
        </footer>
      )}
    </div>
  );
}
