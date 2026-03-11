import { ShoppingCart, Menu, X, User, LogOut, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'wouter';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { queryClient } from '@/lib/queryClient';
import ThemeToggle from '@/components/ThemeToggle';
import AnimatedLogo from '@/components/AnimatedLogo';

interface CartItem {
  id: string;
  songId?: string;
  merchId?: string;
  beatId?: string;
  itemType: string;
  quantity: number;
  title: string;
  price: string;
  size?: string;
}

export default function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const { data: cartItems = [] } = useQuery<CartItem[]>({
    queryKey: ['/api/cart'],
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/cart/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to remove item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
  });

  const cartCount = cartItems.length;
  const subtotal = cartItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const memberDiscount = user ? subtotal * 0.15 : 0;
  const discountedSubtotal = subtotal - memberDiscount;
  const tax = discountedSubtotal * 0.08;
  const cartTotal = discountedSubtotal + tax;

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/music', label: 'Featured' },
    { href: '/catalog', label: 'Catalog' },
    { href: '/videos', label: 'Videos' },
    { href: '/fan-wall', label: 'Fan Wall' },
    { href: '/producer', label: 'Producer' },
    { href: '/merch', label: 'Merch' },
    { href: '/join', label: 'Join' },
  ];

  const handleLogout = async () => {
    await logout();
    setLocation('/');
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          <Link href="/" className="flex items-center gap-3 hover-elevate active-elevate-2 rounded-md px-2 py-1 -ml-2">
            <AnimatedLogo className="h-20 w-auto" />
            <div className="hidden lg:flex flex-col relative backdrop-blur-sm bg-white/5 dark:bg-white/10 px-4 py-2 rounded-lg border border-white/20 shadow-[0_8px_32px_0_rgba(139,92,246,0.2)]">
              <span className="font-display font-black text-xl leading-tight bg-gradient-to-br from-primary via-chart-2 to-primary bg-clip-text text-transparent [text-shadow:_0_0_20px_rgb(139_92_246_/_40%),_0_2px_4px_rgb(0_0_0_/_80%)] drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]">
                PROJECT DNA
              </span>
              <span className="font-display text-xs font-semibold bg-gradient-to-r from-muted-foreground to-primary/60 bg-clip-text text-transparent tracking-wider [text-shadow:_0_1px_2px_rgb(0_0_0_/_60%)]">
                MUSIC LLC
              </span>
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={location === item.href ? 'secondary' : 'ghost'}
                  className="font-display"
                  data-testid={`link-${item.label.toLowerCase()}`}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <Link href="/exclusive">
                  <Button variant="ghost" className="hidden md:flex" data-testid="link-exclusive">
                    Exclusive
                  </Button>
                </Link>
                <Link href="/album-covers">
                  <Button variant="ghost" className="hidden md:flex" data-testid="link-album-covers">
                    Album Covers
                  </Button>
                </Link>
                <Link href="/support">
                  <Button variant="ghost" className="hidden md:flex" data-testid="link-support">
                    Support
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" data-testid="button-user-menu">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled className="font-semibold">
                      {user.username}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/orders" data-testid="link-orders-mobile">
                        My Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/playlists" data-testid="link-playlists-mobile">
                        My Playlists
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/exclusive" data-testid="link-exclusive-mobile">
                        Exclusive Content
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/album-covers" data-testid="link-album-covers-mobile">
                        Album Covers
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/support" data-testid="link-support-mobile">
                        Support
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link href="/login">
                <Button variant="default" className="hidden md:flex" data-testid="button-login-header">
                  Login
                </Button>
              </Link>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="icon" 
                  variant="ghost"
                  className="relative"
                  data-testid="button-cart"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <Badge 
                      variant="default" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      data-testid="badge-cart-count"
                    >
                      {cartCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                {cartCount === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Your cart is empty
                  </div>
                ) : (
                  <>
                    <div className="p-2 max-h-96 overflow-y-auto space-y-2">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex items-start gap-2 p-2 rounded-md hover-elevate" data-testid={`cart-item-${item.id}`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate" data-testid={`cart-item-title-${item.id}`}>
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.itemType === 'song' && 'Song'}
                              {item.itemType === 'beat' && 'Beat'}
                              {item.itemType === 'merch' && `Merch${item.size ? ` (${item.size})` : ''}`}
                            </p>
                            <p className="text-sm font-semibold" data-testid={`cart-item-price-${item.id}`}>
                              ${parseFloat(item.price).toFixed(2)}
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteItemMutation.mutate(item.id);
                            }}
                            data-testid={`button-remove-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <DropdownMenuSeparator />
                    <div className="p-3 space-y-2">
                      <div className="flex justify-between items-center font-semibold">
                        <span>Subtotal:</span>
                        <span data-testid="cart-subtotal">${cartTotal.toFixed(2)}</span>
                      </div>
                      <Link href="/cart">
                        <Button className="w-full" data-testid="button-view-cart">
                          View Cart
                        </Button>
                      </Link>
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="icon"
              variant="ghost"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-menu-toggle"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <nav className="flex flex-col p-4 gap-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={location === item.href ? 'secondary' : 'ghost'}
                  className="w-full justify-start font-display"
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid={`link-mobile-${item.label.toLowerCase()}`}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
            {user ? (
              <>
                <Link href="/exclusive">
                  <Button
                    variant={location === '/exclusive' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="link-mobile-exclusive"
                  >
                    Exclusive Content
                  </Button>
                </Link>
                <Link href="/support">
                  <Button
                    variant={location === '/support' ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid="link-mobile-support"
                  >
                    Support
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  data-testid="button-mobile-logout"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button
                  variant="default"
                  className="w-full justify-start"
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid="button-mobile-login"
                >
                  Login
                </Button>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
