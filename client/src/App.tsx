import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { AudioProvider } from "@/lib/AudioContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Music from "@/pages/Music";
import Catalog from "@/pages/Catalog";
import Videos from "@/pages/Videos";
import Producer from "@/pages/Producer";
import Merch from "@/pages/Merch";
import Cart from "@/pages/Cart";
import BeatLicensing from "@/pages/BeatLicensing";
import Checkout from "@/pages/Checkout";
import OrderSuccess from "@/pages/OrderSuccess";
import AdminDashboard from "@/pages/AdminDashboard";
import JoinFans from "@/pages/JoinFans";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ExclusiveContent from "@/pages/ExclusiveContent";
import Support from "@/pages/Support";
import OrderHistory from "@/pages/OrderHistory";
import Contact from "@/pages/Contact";
import FAQ from "@/pages/FAQ";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import DownloadRecovery from "@/pages/DownloadRecovery";
import AlbumCovers from "@/pages/AlbumCovers";
import Account from "@/pages/Account";
import FanWall from "@/pages/FanWall";
import Playlists from "@/pages/Playlists";
import PlaylistDetail from "@/pages/PlaylistDetail";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/music" component={Music} />
      <Route path="/catalog" component={Catalog} />
      <Route path="/videos" component={Videos} />
      <Route path="/producer" component={Producer} />
      <Route path="/merch" component={Merch} />
      <Route path="/join" component={JoinFans} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/exclusive" component={ExclusiveContent} />
      <Route path="/support" component={Support} />
      <Route path="/orders" component={OrderHistory} />
      <Route path="/cart" component={Cart} />
      <Route path="/beat-licensing" component={BeatLicensing} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/order-success" component={OrderSuccess} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/contact" component={Contact} />
      <Route path="/faq" component={FAQ} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/download-recovery" component={DownloadRecovery} />
      <Route path="/album-covers" component={AlbumCovers} />
      <Route path="/account" component={Account} />
      <Route path="/fan-wall" component={FanWall} />
      <Route path="/playlists" component={Playlists} />
      <Route path="/playlists/:id" component={PlaylistDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AudioProvider>
            <TooltipProvider>
              <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1">
                  <Router />
                </main>
                <Footer />
              </div>
              <Toaster />
            </TooltipProvider>
          </AudioProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
