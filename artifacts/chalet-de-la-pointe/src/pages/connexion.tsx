import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import heroImg from "@assets/IMG_0559_1777733069151.jpg";

export default function Connexion() {
  const { login, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    setLocation("/tableau-de-bord");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      setLocation("/tableau-de-bord");
    } catch {
      setError("Identifiants invalides. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left, form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 xl:px-24 py-16 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-sm w-full mx-auto"
        >
          <Link href="/" className="inline-block mb-12 text-sm tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors">
            ← Accueil
          </Link>

          <h1 className="text-3xl md:text-4xl font-serif text-primary mb-2">Bienvenue</h1>
          <p className="text-muted-foreground mb-10">Connectez-vous à votre espace personnel.</p>

          {error && (
            <div className="mb-6 px-4 py-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" data-testid="form-connexion">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs tracking-widest uppercase text-muted-foreground">
                Courriel
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-border bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="vous@exemple.ca"
                data-testid="input-email"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs tracking-widest uppercase text-muted-foreground">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-border bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="••••••••"
                data-testid="input-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full bg-primary text-primary-foreground py-4 text-sm tracking-widest uppercase hover:bg-primary/90 transition-colors disabled:opacity-60"
              data-testid="button-connexion"
            >
              {isLoading ? "Connexion…" : "Se connecter"}
            </button>
          </form>

          <p className="mt-8 text-sm text-muted-foreground text-center">
            Pas encore de compte ?{" "}
            <Link href="/inscription" className="text-primary underline-offset-4 hover:underline" data-testid="link-inscription">
              Créer un compte
            </Link>
          </p>

          <p className="mt-3 text-xs text-muted-foreground/60 text-center italic">
            Astuce : utilisez « admin@... » pour accéder au panneau administrateur.
          </p>
        </motion.div>
      </div>

      {/* Right, image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img src={heroImg} alt="Vue du lac" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary/20" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <p className="font-serif text-3xl leading-snug">"Le silence du lac est une langue que tout le monde comprend."</p>
          <p className="mt-4 text-sm tracking-widest uppercase text-white/60">Chalet St-Mathieu</p>
        </div>
      </div>
    </div>
  );
}
