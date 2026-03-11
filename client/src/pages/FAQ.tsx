import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

export default function FAQ() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h1>
          <p className="text-muted-foreground">
            Find answers to common questions about our music platform, purchases, and services
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Music Purchases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" data-testid="faq-music-formats">
                  <AccordionTrigger>What format are the music files?</AccordionTrigger>
                  <AccordionContent>
                    All music tracks are available in high-quality WAV format, ensuring the best listening experience. These are professional-quality audio files suitable for personal listening and production use.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2" data-testid="faq-music-download">
                  <AccordionTrigger>How do I download my purchased music?</AccordionTrigger>
                  <AccordionContent>
                    After completing your purchase, you'll receive immediate access to download your tracks. You can download them from your order confirmation page or access them anytime from your account dashboard.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3" data-testid="faq-music-streaming">
                  <AccordionTrigger>Can I stream music before purchasing?</AccordionTrigger>
                  <AccordionContent>
                    Yes! You can preview all tracks on our Music and Catalog pages. Simply click the play button on any track to listen before making a purchase decision.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4" data-testid="faq-music-license">
                  <AccordionTrigger>What rights do I get when I purchase a song?</AccordionTrigger>
                  <AccordionContent>
                    When you purchase a song, you receive a personal use license. This allows you to listen to the music for personal enjoyment, but does not grant commercial redistribution rights. For commercial use, please contact us for licensing options.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Beat Licensing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="beat-1" data-testid="faq-beat-license-types">
                  <AccordionTrigger>What types of beat licenses are available?</AccordionTrigger>
                  <AccordionContent>
                    We offer various licensing options for our beats, including basic lease licenses and exclusive rights. Each license comes with different usage rights and distribution limits. Visit our Producer page for detailed licensing information.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="beat-2" data-testid="faq-beat-files">
                  <AccordionTrigger>What files do I receive with a beat purchase?</AccordionTrigger>
                  <AccordionContent>
                    Beat purchases typically include high-quality audio files in WAV format. Depending on your license type, you may also receive trackout stems and additional formats. Check the specific beat listing for details.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="beat-3" data-testid="faq-beat-exclusive">
                  <AccordionTrigger>Can I get exclusive rights to a beat?</AccordionTrigger>
                  <AccordionContent>
                    Yes! We offer exclusive licensing options for beats. When you purchase exclusive rights, the beat is removed from our catalog and you become the sole owner of the commercial rights. Contact us for exclusive licensing inquiries.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Merchandise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="merch-1" data-testid="faq-merch-shipping">
                  <AccordionTrigger>How long does shipping take?</AccordionTrigger>
                  <AccordionContent>
                    Standard shipping typically takes 5-7 business days within the continental United States. International shipping times vary by location. You'll receive tracking information once your order ships.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="merch-2" data-testid="faq-merch-sizes">
                  <AccordionTrigger>What sizes are available for apparel?</AccordionTrigger>
                  <AccordionContent>
                    Our apparel is available in sizes ranging from Small to 2XL. Each product page includes a detailed size chart to help you find the perfect fit. If you're between sizes, we recommend sizing up.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="merch-3" data-testid="faq-merch-returns">
                  <AccordionTrigger>What is your return policy?</AccordionTrigger>
                  <AccordionContent>
                    We accept returns within 30 days of purchase for unworn, unwashed merchandise in original condition with tags attached. Digital purchases (music and beats) are non-refundable. Contact our support team to initiate a return.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Payment & Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="payment-1" data-testid="faq-payment-methods">
                  <AccordionTrigger>What payment methods do you accept?</AccordionTrigger>
                  <AccordionContent>
                    We accept all major credit cards (Visa, Mastercard, American Express, Discover) and debit cards through our secure Stripe payment processing system. Your payment information is encrypted and never stored on our servers.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="payment-2" data-testid="faq-payment-secure">
                  <AccordionTrigger>Is my payment information secure?</AccordionTrigger>
                  <AccordionContent>
                    Absolutely. We use Stripe, a PCI-DSS compliant payment processor, to handle all transactions. Your payment details are encrypted and transmitted directly to Stripe's secure servers. We never store your credit card information.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="payment-3" data-testid="faq-account-required">
                  <AccordionTrigger>Do I need an account to make a purchase?</AccordionTrigger>
                  <AccordionContent>
                    No, you can checkout as a guest without creating an account. However, creating an account allows you to track your orders, save your cart, and quickly access your purchased music and beats.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="payment-4" data-testid="faq-cart-saved">
                  <AccordionTrigger>Is my shopping cart saved?</AccordionTrigger>
                  <AccordionContent>
                    Yes! Your shopping cart is automatically saved for 7 days, even if you close your browser. Items will remain in your cart until you complete the purchase or they expire after the 7-day period.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Technical Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="tech-1" data-testid="faq-tech-issues">
                  <AccordionTrigger>I'm having trouble playing music. What should I do?</AccordionTrigger>
                  <AccordionContent>
                    First, try refreshing your browser and checking your internet connection. Make sure your browser is up to date and that you're using a modern browser like Chrome, Firefox, Safari, or Edge. If issues persist, please contact our support team.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tech-2" data-testid="faq-tech-browsers">
                  <AccordionTrigger>What browsers are supported?</AccordionTrigger>
                  <AccordionContent>
                    Our platform works best on the latest versions of Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated for the best experience and security.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tech-3" data-testid="faq-tech-contact">
                  <AccordionTrigger>How do I get additional help?</AccordionTrigger>
                  <AccordionContent>
                    If you can't find the answer you're looking for, please visit our Contact page and send us a message. We typically respond within 24-48 hours during business days.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
