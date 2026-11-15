import { useState } from "react";
import { Link, Redirect } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import heroImg from "@assets/IMG_0559_1777733069151.jpg";

export default function Connexion() {
  const { login, isAuthenticated, authError } = useAuth();
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Redirect to={new URLSearchParams(location.search).get("suite") === "approbations" ? "/tableau-de-bord?onglet=approbations" : "/calendrier?reprendre=1"} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email);
      setSent(true);
    } catch {
      setError("Envoi impossible. Vérifiez votre adresse de propriétaire ou réessayez plus tard.");
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
          <p className="text-muted-foreground mb-10">Recevez un lien de connexion à votre adresse de propriétaire.</p>

          {(error || authError) && (
            <div className="mb-6 px-4 py-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-sm">
              {error || authError}
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
                onChange={(e) => { setEmail(e.target.value); setSent(false); }}
                className="w-full border border-border bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="vous@exemple.ca"
                data-testid="input-email"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || sent}
              className="mt-2 w-full bg-primary text-primary-foreground py-4 text-sm tracking-widest uppercase hover:bg-primary/90 transition-colors disabled:opacity-60"
              data-testid="button-connexion"
            >
              {isLoading ? "Envoi…" : "Recevoir mon lien"}
            </button>
          </form>

          {sent && <p role="status" className="mt-6 text-primary">Si cette adresse est invitée, un lien de connexion vous attend dans votre boîte courriel.</p>}
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
