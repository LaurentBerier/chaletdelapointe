import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import mistyImg from "@assets/IMG_6664_1777733051950.jpg";

export default function Inscription() {
  const { register, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
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
    if (password.length < 6) {
      setError("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }
    setIsLoading(true);
    try {
      await register(name, email, password);
      setLocation("/tableau-de-bord");
    } catch {
      setError("Une erreur s'est produite. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left, image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img src={mistyImg} alt="Brume matinale" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary/20" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <p className="font-serif text-3xl leading-snug">"Chaque séjour laisse une trace que le lac garde en mémoire."</p>
          <p className="mt-4 text-sm tracking-widest uppercase text-white/60">Saint-Mathieu-de-Rioux</p>
        </div>
      </div>

      {/* Right, form */}
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

          <h1 className="text-3xl md:text-4xl font-serif text-primary mb-2">Créer un compte</h1>
          <p className="text-muted-foreground mb-10">Rejoignez la communauté ChaletDeLaPointe.</p>

          {error && (
            <div className="mb-6 px-4 py-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" data-testid="form-inscription">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-xs tracking-widest uppercase text-muted-foreground">
                Nom complet
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-border bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="Jean Tremblay"
                data-testid="input-name"
              />
            </div>

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
                placeholder="Minimum 6 caractères"
                data-testid="input-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full bg-primary text-primary-foreground py-4 text-sm tracking-widest uppercase hover:bg-primary/90 transition-colors disabled:opacity-60"
              data-testid="button-inscription"
            >
              {isLoading ? "Création…" : "Créer mon compte"}
            </button>
          </form>

          <p className="mt-8 text-sm text-muted-foreground text-center">
            Déjà un compte ?{" "}
            <Link href="/connexion" className="text-primary underline-offset-4 hover:underline" data-testid="link-connexion">
              Se connecter
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
