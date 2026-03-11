import { useEffect } from 'react';
import { Link } from 'wouter';
import { Facebook, Twitter, Instagram, Youtube, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import AnimatedLogo from '@/components/AnimatedLogo';

export default function Footer() {
  const { data: visitorData } = useQuery<{ count: number }>({
    queryKey: ['/api/visitor-count'],
  });

  const incrementMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/visitor-count');
      return res.json();
    },
  });

  useEffect(() => {
    const visited = sessionStorage.getItem('dna-visited');
    if (!visited) {
      sessionStorage.setItem('dna-visited', '1');
      incrementMutation.mutate();
    }
  }, []);

  const formatCount = (n: number) => n.toLocaleString();

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link href="/">
              <AnimatedLogo className="h-16 w-auto cursor-pointer" />
            </Link>
            <div>
              <h3 className="font-display font-bold text-lg mb-2 bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                Project DNA Music
              </h3>
              <p className="text-sm text-muted-foreground">
                Energy • Light • Love Through Sound
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Quick Links</h4>
            <div className="flex flex-col gap-2">
              <Link href="/about">
                <Button variant="ghost" className="justify-start px-0 h-auto" data-testid="link-footer-about">
                  About
                </Button>
              </Link>
              <Link href="/music">
                <Button variant="ghost" className="justify-start px-0 h-auto" data-testid="link-footer-music">
                  Music
                </Button>
              </Link>
              <Link href="/merch">
                <Button variant="ghost" className="justify-start px-0 h-auto" data-testid="link-footer-merch">
                  Merch
                </Button>
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Support</h4>
            <div className="flex flex-col gap-2">
              <a 
                href="mailto:support@projectdnamusic.info" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                data-testid="link-footer-support-email"
              >
                support@projectdnamusic.info
              </a>
              <Link href="/contact">
                <Button variant="ghost" className="justify-start px-0 h-auto" data-testid="link-footer-contact">
                  Contact
                </Button>
              </Link>
              <Link href="/faq">
                <Button variant="ghost" className="justify-start px-0 h-auto" data-testid="link-footer-faq">
                  FAQ
                </Button>
              </Link>
              <Link href="/privacy">
                <Button variant="ghost" className="justify-start px-0 h-auto" data-testid="link-footer-privacy">
                  Privacy Policy
                </Button>
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Follow Us</h4>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" data-testid="button-social-facebook">
                <Facebook className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" data-testid="button-social-twitter">
                <Twitter className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" data-testid="button-social-instagram">
                <Instagram className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" data-testid="button-social-youtube">
                <Youtube className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground space-y-3">
          <div className="flex items-center justify-center gap-2" data-testid="visitor-counter">
            <Eye className="h-4 w-4 text-primary" />
            <span className="font-display font-semibold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              {visitorData ? formatCount(visitorData.count) : '---'}
            </span>
            <span>visitors</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Project DNA Music LLC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
