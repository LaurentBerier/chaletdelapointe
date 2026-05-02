import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "react-day-picker/style.css";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/components/protected-route";
import Home from "@/pages/home";
import Chalet from "@/pages/chalet";
import Calendrier from "@/pages/calendrier";
import Blogue from "@/pages/blogue";
import Article from "@/pages/article";
import Contact from "@/pages/contact";
import Connexion from "@/pages/connexion";
import Inscription from "@/pages/inscription";
import TableauDeBord from "@/pages/tableau-de-bord";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chalet" component={Chalet} />
      <Route path="/calendrier" component={Calendrier} />
      <Route path="/blogue" component={Blogue} />
      <Route path="/blogue/:slug" component={Article} />
      <Route path="/contact" component={Contact} />
      <Route path="/connexion" component={Connexion} />
      <Route path="/inscription" component={Inscription} />
      <Route path="/tableau-de-bord">
        <ProtectedRoute>
          <TableauDeBord />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Layout>
              <Router />
            </Layout>
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
