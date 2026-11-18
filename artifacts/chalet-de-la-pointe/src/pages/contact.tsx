import { motion } from "framer-motion";
import { useRef, useState, type FormEvent } from "react";

export default function Contact() {
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const lastSubmission = useRef<{ data: string; id: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const payload = Object.fromEntries(
      ["name", "email", "dates", "message", "website"].map((key) => [
        key,
        String(fields.get(key) || "").trim(),
      ]),
    );
    const data = JSON.stringify(payload);
    if (lastSubmission.current?.data !== data)
      lastSubmission.current = { data, id: crypto.randomUUID() };
    submitting.current = true;
    setStatus("sending");
    setError("");
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          requestId: lastSubmission.current.id,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success !== true) {
        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : "L’envoi a échoué. Veuillez réessayer ou nous écrire par courriel.",
        );
      }
      form.reset();
      lastSubmission.current = null;
      setStatus("success");
    } catch (err) {
      setError(
        err instanceof Error && err.name === "Error"
          ? err.message
          : "L’envoi n’a pas pu être confirmé. Vérifiez votre connexion et réessayez.",
      );
      setStatus("error");
    } finally {
      submitting.current = false;
    }
  }

  return (
    <div className="pt-24 min-h-screen bg-background">
      <div className="container mx-auto px-6 max-w-5xl pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-serif text-primary mb-8">
              Nous joindre
            </h1>
            <div className="prose prose-lg prose-p:text-muted-foreground prose-p:leading-relaxed">
              <p>
                Vous envisagez un séjour au Chalet St-Mathieu ou vous avez des
                questions concernant nos installations ? N'hésitez pas à nous
                écrire.
              </p>
              <p>Nous répondons généralement dans un délai de 24 heures.</p>
            </div>

            <div className="mt-16 space-y-8 text-primary">
              <div>
                <h3 className="text-sm font-medium tracking-widest uppercase mb-2 text-muted-foreground">
                  Adresse
                </h3>
                <p className="text-lg">
                  Lac Saint-Mathieu
                  <br />
                  Saint-Mathieu-de-Rioux, QC
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium tracking-widest uppercase mb-2 text-muted-foreground">
                  Courriel
                </h3>
                <a
                  href="mailto:reservations@chaletdelapointe.com"
                  className="text-lg break-all hover:opacity-70 transition-opacity"
                >
                  reservations@chaletdelapointe.com
                </a>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white p-8 md:p-12 shadow-sm border border-border/50"
          >
            <form
              className="space-y-6"
              onSubmit={handleSubmit}
              aria-busy={status === "sending"}
            >
              <div className="hidden" aria-hidden="true">
                <label htmlFor="contact-website">Site Web</label>
                <input
                  id="contact-website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-primary mb-2"
                >
                  Nom complet
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  maxLength={120}
                  autoComplete="name"
                  disabled={status === "sending"}
                  className="w-full border-b border-border bg-transparent py-3 focus:outline-none focus:border-primary transition-colors text-primary placeholder:text-muted-foreground/50"
                  placeholder="Votre nom"
                  data-testid="input-contact-name"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-primary mb-2"
                >
                  Courriel
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  disabled={status === "sending"}
                  className="w-full border-b border-border bg-transparent py-3 focus:outline-none focus:border-primary transition-colors text-primary placeholder:text-muted-foreground/50"
                  placeholder="nom@exemple.com"
                  data-testid="input-contact-email"
                />
              </div>

              <div>
                <label
                  htmlFor="dates"
                  className="block text-sm font-medium text-primary mb-2"
                >
                  Dates souhaitées (optionnel)
                </label>
                <input
                  type="text"
                  id="dates"
                  name="dates"
                  maxLength={200}
                  disabled={status === "sending"}
                  className="w-full border-b border-border bg-transparent py-3 focus:outline-none focus:border-primary transition-colors text-primary placeholder:text-muted-foreground/50"
                  placeholder="ex: 12 au 18 octobre"
                  data-testid="input-contact-dates"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-primary mb-2"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  maxLength={5000}
                  disabled={status === "sending"}
                  rows={4}
                  className="w-full border-b border-border bg-transparent py-3 focus:outline-none focus:border-primary transition-colors text-primary placeholder:text-muted-foreground/50 resize-none"
                  placeholder="Comment pouvons-nous vous aider ?"
                  data-testid="input-contact-message"
                ></textarea>
              </div>

              {status === "success" && (
                <p
                  role="status"
                  className="text-sm text-primary"
                  data-testid="contact-success"
                >
                  Merci ! Votre message a bien été envoyé. Nous vous répondrons
                  généralement dans un délai de 24 heures.
                </p>
              )}
              {status === "error" && (
                <p
                  role="alert"
                  className="text-sm text-destructive"
                  data-testid="contact-error"
                >
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full bg-primary text-primary-foreground py-4 text-sm tracking-wider uppercase hover:bg-primary/90 transition-colors mt-8 disabled:opacity-60 disabled:cursor-wait"
                data-testid="button-contact-submit"
              >
                {status === "sending"
                  ? "Envoi en cours…"
                  : "Envoyer le message"}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
