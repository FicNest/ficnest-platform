import React from "react";
import { Shield } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-6 flex items-center">
          <Shield className="mr-2" />
          Privacy Policy
        </h1>
        <p className="text-gray-600 mb-8">Effective Date: May 20, 2025</p>
        <div className="prose max-w-none">
          <p>FicNest is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights.</p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
          <p>We may collect:</p>
          <ul className="list-disc pl-6">
            <li><strong>Personal Data</strong>: Username and email (if account is created).</li>
            <li><strong>Usage Data</strong>: Pages visited, time spent, reading behavior.</li>
            <li><strong>Device Info</strong>: Browser type, IP address, device type, operating system.</li>
            <li><strong>Ad Data</strong>: Google AdSense may collect cookie and usage data to serve personalized ads.</li>
          </ul>
          <p className="mt-4">We do not collect:</p>
          <ul className="list-disc pl-6">
            <li>Payment information (as there are no subscriptions).</li>
            <li>Sensitive personal information.</li>
          </ul>
          <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Your Data</h2>
          <p>We use collected data to:</p>
          <ul className="list-disc pl-6">
            <li>Manage your account (if registered)</li>
            <li>Personalize your reading experience</li>
            <li>Improve website performance</li>
            <li>Display relevant advertisements via Google AdSense</li>
            <li>Ensure security and prevent misuse</li>
          </ul>
          <h2 className="text-2xl font-semibold mt-8 mb-4">3. Google AdSense</h2>
          <p>We use Google AdSense for advertising. Third-party vendors, including Google, use cookies to serve ads based on prior visits to this and other websites.</p>
          <p>You may opt out of personalized advertising here: <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Ad Settings</a></p>
          <p>For more details, visit <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google's Privacy & Terms</a></p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Retention & Deletion</h2>
          <ul className="list-disc pl-6">
            <li>You may delete your account at any time.</li>
            <li>Upon deletion, all your personal data is permanently removed from our systems.</li>
            <li>Non-personal, aggregate data (analytics) may be retained.</li>
          </ul>
          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Cookies and Tracking</h2>
          <p>We use cookies to:</p>
          <ul className="list-disc pl-6">
            <li>Track reading progress</li>
            <li>Save user preferences</li>
            <li>Improve site performance</li>
            <li>Enable ad targeting via AdSense</li>
          </ul>
          <p>You can control cookies via your browser settings. Disabling cookies may affect site functionality.</p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">6. Children's Privacy</h2>
          <p>FicNest is not directed to children under 13. We do not knowingly collect data from children. If notified, we will promptly delete such data.</p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">7. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have rights to:</p>
          <ul className="list-disc pl-6">
            <li>Access your data</li>
            <li>Correct inaccuracies</li>
            <li>Delete your account and data</li>
            <li>Opt out of personalized advertising</li>
          </ul>
          <p>Contact us at <a href="mailto:privacy@ficnest.com" className="text-primary hover:underline">privacy@ficnest.com</a> to make a request.</p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">8. Updates</h2>
          <p>We may revise this policy. Continued use of the site after any changes implies acceptance of the new policy.</p>
        </div>
      </div>
    </div>
  );
}