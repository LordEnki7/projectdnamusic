import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">
            Last updated: October 6, 2025
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Introduction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Project DNA Music LLC ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
              </p>
              <p>
                Please read this privacy policy carefully. By using our platform, you agree to the collection and use of information in accordance with this policy.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Account Information</h3>
                <p>
                  When you create an account, we collect your username and password. This information is used to authenticate your access to our platform and provide you with personalized services.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Shopping Cart and Purchase Data</h3>
                <p>
                  We collect information about items you add to your shopping cart and purchases you make, including songs, beats, and merchandise. This data is stored in our PostgreSQL database and is used to process your orders.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Payment Information</h3>
                <p>
                  Payment processing is handled securely by Stripe, our third-party payment processor. We do not store your credit card information on our servers. Stripe collects and processes payment information according to their own privacy policy.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Session and Cookie Data</h3>
                <p>
                  We use session cookies to maintain your shopping cart and authentication status. These cookies are essential for the proper functioning of our e-commerce platform and expire after 7 days of inactivity.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Process and fulfill your orders for music, beats, and merchandise</li>
                <li>Maintain your account and authenticate your access</li>
                <li>Provide customer support and respond to your inquiries</li>
                <li>Improve our platform and develop new features</li>
                <li>Send you important updates about your orders and account</li>
                <li>Comply with legal obligations and protect our rights</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Storage and Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">User Account Information</h3>
                <p>
                  User account credentials (usernames and passwords) are stored temporarily in server memory during your session. This means account information does not persist after server restarts. Your password is securely hashed before storage and is never stored in plain text.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Product and Transaction Data</h3>
                <p>
                  Product information (songs, beats, merchandise) and shopping cart data are stored in a secure PostgreSQL database hosted on Neon's serverless platform. This data persists across sessions and server restarts.
                </p>
              </div>
              <p>
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
              <p>
                However, please note that no method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Third-Party Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Stripe Payment Processing</h3>
                <p>
                  We use Stripe to process payments. When you make a purchase, your payment information is transmitted directly to Stripe and processed according to their privacy policy and security standards. Stripe is PCI-DSS compliant and maintains the highest level of security for payment processing.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Database Hosting</h3>
                <p>
                  Our database is hosted on Neon's serverless PostgreSQL platform. Neon implements industry-standard security measures to protect data stored on their infrastructure.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Rights and Choices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate or incomplete information</li>
                <li>Request deletion of your account and associated data</li>
                <li>Opt out of marketing communications (when applicable)</li>
                <li>Withdraw consent for data processing where consent is the legal basis</li>
              </ul>
              <p className="mt-4">
                To exercise any of these rights, please contact us using the information provided in the Contact section below.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cookies and Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We use session cookies to maintain your login status and shopping cart contents. These cookies are essential for the platform's functionality and are automatically deleted when you close your browser or after 7 days of inactivity.
              </p>
              <p>
                We do not use third-party tracking cookies or analytics services that track your behavior across other websites.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Retention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We retain your personal information for as long as your account is active or as needed to provide you with our services. If you wish to delete your account, please contact us, and we will remove your personal information from our systems, except where we are required to retain it for legal or regulatory purposes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Our services are not directed to individuals under the age of 13. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us, and we will take steps to delete such information.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Changes to This Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons. We will notify you of any material changes by updating the "Last updated" date at the top of this policy.
              </p>
              <p>
                We encourage you to review this Privacy Policy periodically to stay informed about how we are protecting your information.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-muted rounded-md">
                <p className="font-semibold">Project DNA Music LLC</p>
                <p className="text-muted-foreground mt-2">
                  For privacy-related inquiries, please use the contact form on our Contact page or reach out through our support channels.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
