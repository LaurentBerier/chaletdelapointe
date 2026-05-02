import { motion } from "framer-motion";

export default function Contact() {
  return (
    <div className="pt-24 min-h-screen bg-background">
      <div className="container mx-auto px-6 max-w-5xl pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-serif text-primary mb-8">Nous joindre</h1>
            <div className="prose prose-lg prose-p:text-muted-foreground prose-p:leading-relaxed">
              <p>
                Vous envisagez un séjour au Chalet St-Mathieu ou vous avez des questions concernant nos installations ? N'hésitez pas à nous écrire.
              </p>
              <p>
                Nous répondons généralement dans un délai de 24 heures.
              </p>
            </div>

            <div className="mt-16 space-y-8 text-primary">
              <div>
                <h3 className="text-sm font-medium tracking-widest uppercase mb-2 text-muted-foreground">Adresse</h3>
                <p className="text-lg">Lac Saint-Mathieu<br/>Saint-Mathieu-de-Rioux, QC</p>
              </div>
              <div>
                <h3 className="text-sm font-medium tracking-widest uppercase mb-2 text-muted-foreground">Courriel</h3>
                <a href="mailto:bonjour@chaletdelapointe.ca" className="text-lg hover:opacity-70 transition-opacity">bonjour@chaletdelapointe.ca</a>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white p-8 md:p-12 shadow-sm border border-border/50"
          >
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-primary mb-2">Nom complet</label>
                <input 
                  type="text" 
                  id="name" 
                  className="w-full border-b border-border bg-transparent py-3 focus:outline-none focus:border-primary transition-colors text-primary placeholder:text-muted-foreground/50"
                  placeholder="Votre nom"
                  data-testid="input-contact-name"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-primary mb-2">Courriel</label>
                <input 
                  type="email" 
                  id="email" 
                  className="w-full border-b border-border bg-transparent py-3 focus:outline-none focus:border-primary transition-colors text-primary placeholder:text-muted-foreground/50"
                  placeholder="nom@exemple.com"
                  data-testid="input-contact-email"
                />
              </div>

              <div>
                <label htmlFor="dates" className="block text-sm font-medium text-primary mb-2">Dates souhaitées (optionnel)</label>
                <input 
                  type="text" 
                  id="dates" 
                  className="w-full border-b border-border bg-transparent py-3 focus:outline-none focus:border-primary transition-colors text-primary placeholder:text-muted-foreground/50"
                  placeholder="ex: 12 au 18 octobre"
                  data-testid="input-contact-dates"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-primary mb-2">Message</label>
                <textarea 
                  id="message" 
                  rows={4}
                  className="w-full border-b border-border bg-transparent py-3 focus:outline-none focus:border-primary transition-colors text-primary placeholder:text-muted-foreground/50 resize-none"
                  placeholder="Comment pouvons-nous vous aider ?"
                  data-testid="input-contact-message"
                ></textarea>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary text-primary-foreground py-4 text-sm tracking-wider uppercase hover:bg-primary/90 transition-colors mt-8"
                data-testid="button-contact-submit"
              >
                Envoyer le message
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
