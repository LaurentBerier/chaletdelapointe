import { motion } from "framer-motion";
import { DayPicker } from "react-day-picker";
import { addDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";

export default function Calendrier() {
  const today = new Date();
  
  // Hardcoded mocked unavailable dates
  const bookedDays = [
    { from: subDays(today, 5), to: addDays(today, 2) },
    { from: addDays(today, 8), to: addDays(today, 12) },
    { from: addDays(today, 20), to: addDays(today, 25) },
    { from: addDays(today, 35), to: addDays(today, 40) },
  ];

  return (
    <div className="pt-24 min-h-screen bg-background">
      <div className="container mx-auto px-6 max-w-4xl pb-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-serif text-primary mb-6">Calendrier des disponibilités</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Consultez les dates disponibles pour votre prochain séjour. Les dates barrées en rouge sont déjà réservées.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-white p-6 md:p-12 shadow-sm border border-border/50 flex justify-center pointer-events-none"
        >
          <DayPicker 
            mode="multiple"
            numberOfMonths={2}
            pagedNavigation
            locale={fr}
            modifiers={{ booked: bookedDays }}
            modifiersStyles={{
              booked: { 
                backgroundColor: 'hsl(var(--destructive)/0.05)', 
                color: 'hsl(var(--destructive))', 
                textDecoration: 'line-through',
                opacity: 0.6
              }
            }}
            className="calendar-wrapper hidden md:block"
          />
          <DayPicker 
            mode="multiple"
            numberOfMonths={1}
            locale={fr}
            modifiers={{ booked: bookedDays }}
            modifiersStyles={{
              booked: { 
                backgroundColor: 'hsl(var(--destructive)/0.05)', 
                color: 'hsl(var(--destructive))', 
                textDecoration: 'line-through',
                opacity: 0.6
              }
            }}
            className="calendar-wrapper block md:hidden"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground mb-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border border-border rounded-full"></div>
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-destructive/10 border border-destructive/20 rounded-full"></div>
              <span>Réservé</span>
            </div>
          </div>

          <a 
            href="mailto:bonjour@chaletdelapointe.ca"
            className="inline-block bg-primary text-primary-foreground px-10 py-4 text-sm tracking-wider uppercase hover:bg-primary/90 transition-colors duration-300"
            data-testid="link-contact-booking"
          >
            Faire une demande
          </a>
        </motion.div>
      </div>
    </div>
  );
}
