import { Scale, Shield, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function Legal() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Scale className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Legal</h2>
          <p className="text-sm text-muted-foreground">Terms, privacy, and data rights</p>
        </div>
      </div>

      <Tabs defaultValue="terms">
        <TabsList className="w-full">
          <TabsTrigger value="terms" className="flex-1 gap-2">
            <Scale className="h-3.5 w-3.5" />
            Terms
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex-1 gap-2">
            <Shield className="h-3.5 w-3.5" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="data" className="flex-1 gap-2">
            <Database className="h-3.5 w-3.5" />
            Data Rights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="terms">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Terms of Service</CardTitle>
              <p className="text-xs text-muted-foreground">Last updated: May 17, 2026</p>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-sm text-muted-foreground">
              <section>
                <h4 className="text-foreground font-medium">1. Service Description</h4>
                <p>
                  HarborMesh is an AI-powered vessel management platform provided by 3D3D ("we", "us").
                  The service includes vessel tracking, inventory management, navigation tools,
                  community data sharing, and AI assistance for boating operations.
                </p>
              </section>

              <section>
                <h4 className="text-foreground font-medium">2. Accounts and Access</h4>
                <p>
                  You must provide accurate information when creating an account. You are responsible
                  for maintaining the security of your account credentials. Free accounts include
                  basic features for one vessel. Paid plans (Pro, Fleet) unlock additional capabilities
                  and higher limits.
                </p>
              </section>

              <section>
                <h4 className="text-foreground font-medium">3. Payments and Subscriptions</h4>
                <p>
                  Paid subscriptions are billed monthly through Ko-fi (PayPal), Bitcoin, or
                  e-transfer. Subscriptions renew automatically unless cancelled. Refunds are handled
                  on a case-by-case basis within 14 days of payment. Price changes will be communicated
                  30 days in advance.
                </p>
              </section>

              <section>
                <h4 className="text-foreground font-medium">4. Acceptable Use</h4>
                <p>
                  You agree not to: reverse engineer the platform, share account access, upload
                  malicious content, or use the service for any unlawful purpose. Community data
                  contributions must be accurate and made in good faith.
                </p>
              </section>

              <section>
                <h4 className="text-foreground font-medium">5. Navigation Disclaimer</h4>
                <p>
                  HarborMesh is a supplementary navigation aid only. It does not replace official
                  nautical charts, safety equipment, or seamanship. Community depth soundings and
                  condition reports are user-contributed and unverified. Always rely on official
                  charts and proper navigation practices. We accept no liability for navigation
                  decisions made using this platform.
                </p>
              </section>

              <section>
                <h4 className="text-foreground font-medium">6. Data Ownership</h4>
                <p>
                  You retain ownership of all data you input into HarborMesh, including vessel
                  information, logs, documents, and inventory records. We do not claim ownership
                  of your content. Community contributions are shared under a collective use license
                  for the benefit of all users.
                </p>
              </section>

              <section>
                <h4 className="text-foreground font-medium">7. Service Availability</h4>
                <p>
                  We aim for high availability but do not guarantee uninterrupted service. Offline
                  mode provides continued access to cached data. We are not liable for any loss
                  resulting from service interruptions.
                </p>
              </section>

              <section>
                <h4 className="text-foreground font-medium">8. Limitation of Liability</h4>
                <p>
                  To the maximum extent permitted by law, 3D3D shall not be liable for any indirect,
                  incidental, special, consequential, or punitive damages arising from your use of
                  the service. Our total liability shall not exceed the amount you paid in the
                  12 months preceding the claim.
                </p>
              </section>

              <section>
                <h4 className="text-foreground font-medium">9. Governing Law</h4>
                <p>
                  These terms are governed by the laws of the Province of New Brunswick, Canada.
                  Any disputes shall be resolved in the courts of New Brunswick.
                </p>
              </section>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Privacy Policy</CardTitle>
              <p className="text-xs text-muted-foreground">Last updated: May 17, 2026</p>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-sm text-muted-foreground">
              <section>
                <h4 className="text-foreground font-medium">What We Collect</h4>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Account information: email address, display name</li>
                  <li>Vessel data: name, dimensions, type (you provide this)</li>
                  <li>GPS position: only when navigation features are active and you consent</li>
                  <li>Telemetry: sensor data from phone or Signal K devices when enabled</li>
                  <li>Usage analytics: page views and feature usage (anonymized)</li>
                </ul>
              </section>

              <section>
                <h4 className="text-foreground font-medium">How We Store It</h4>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Account data: Cloudflare D1 (encrypted at rest)</li>
                  <li>Vessel data: primarily stored locally in your browser (IndexedDB/localStorage)</li>
                  <li>Documents: stored locally, never uploaded without explicit action</li>
                  <li>Community contributions: anonymized before storage on our servers</li>
                </ul>
              </section>

              <section>
                <h4 className="text-foreground font-medium">Who Can Access It</h4>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Your data is yours. We do not sell or share personal data with third parties</li>
                  <li>Community data is shared anonymously with other HarborMesh users</li>
                  <li>Fleet managers can see vessel data for vessels in their fleet (with your consent)</li>
                  <li>We may access data to provide support when you request it</li>
                </ul>
              </section>

              <section>
                <h4 className="text-foreground font-medium">AI and Training</h4>
                <p>
                  Sensitive documents (passports, medical records, financial documents) are never
                  used for AI training. You control whether your data can be processed by cloud
                  AI providers through the consent settings. Local AI processing happens entirely
                  on your device.
                </p>
              </section>

              <section>
                <h4 className="text-foreground font-medium">Cookies and Tracking</h4>
                <p>
                  We use localStorage for app state persistence. We use Cloudflare Web Analytics
                  (privacy-focused, no cookies). We do not use third-party tracking pixels or
                  advertising cookies.
                </p>
              </section>

              <section>
                <h4 className="text-foreground font-medium">Contact</h4>
                <p>
                  For privacy inquiries: privacy@3d3d.ca
                </p>
              </section>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Rights</CardTitle>
              <p className="text-xs text-muted-foreground">Last updated: May 17, 2026</p>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-sm text-muted-foreground">
              <section>
                <h4 className="text-foreground font-medium">Export Your Data</h4>
                <p>
                  You can export all your data at any time from Settings. The export includes
                  vessel profiles, inventory, logs, tasks, documents metadata, and spaces in
                  a standard JSON format. This is your data and you can take it anywhere.
                </p>
              </section>

              <section>
                <h4 className="text-foreground font-medium">Delete Your Data</h4>
                <p>
                  You can delete your account and all associated data by contacting us at
                  privacy@3d3d.ca. Upon deletion request:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Account and profile data: deleted within 7 days</li>
                  <li>Vessel and inventory data: deleted immediately (stored locally)</li>
                  <li>Community contributions: anonymized data remains (cannot be traced to you)</li>
                  <li>Payment records: retained for 7 years per Canadian tax law</li>
                </ul>
              </section>

              <section>
                <h4 className="text-foreground font-medium">Data Portability</h4>
                <p>
                  HarborMesh stores most data locally in your browser. You always have access
                  to your data even without an internet connection. The export format is designed
                  to be interoperable with other vessel management tools.
                </p>
              </section>

              <section>
                <h4 className="text-foreground font-medium">Consent Management</h4>
                <p>
                  You control your data sharing preferences in Settings under Privacy and Consent.
                  You can change these settings at any time. Changes take effect immediately for
                  new data. Previously shared community data that has been anonymized cannot be
                  retroactively removed.
                </p>
              </section>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
