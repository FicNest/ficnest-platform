import React from "react";
import { BookOpen } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-6 flex items-center">
          <BookOpen className="mr-2" />
          Terms of Service
        </h1>
        <p className="text-gray-600 mb-8">Effective Date: May 20, 2025</p>
        <div className="prose max-w-none">
          <p>By accessing or using the FicNest platform, you agree to the following terms. These terms apply to all users, including readers and registered members.</p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">1. General Use</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Respectful Behavior</strong>: Do not post offensive, defamatory, or harassing content.</li>
            <li><strong>Account Security</strong>: If you register, you are responsible for maintaining the confidentiality of your login details.</li>
            <li><strong>Prohibited Actions</strong>:
              <ul className="list-disc pl-6 mt-2">
                <li>Disrupting site functionality</li>
                <li>Gaining unauthorized access</li>
                <li>Scraping or harvesting data</li>
                <li>Using automation tools to interact with the site</li>
              </ul>
            </li>
            <li><strong>External Links</strong>: Clicking third-party links is at your own risk. FicNest is not liable for external content.</li>
            <li><strong>Language</strong>: Comments must be in English or supported languages, and use proper grammar and punctuation.</li>
            <li><strong>Avatar Policy</strong>: Inappropriate or harmful imagery in profile pictures is not allowed.</li>
          </ul>
          <h2 className="text-2xl font-semibold mt-8 mb-4">2. Content Usage</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Personal Reading Only</strong>: Content is for personal use only. Republishing, distributing, or copying content without permission is prohibited.</li>
            <li><strong>No Downloading</strong>: Users may not systematically download or save large volumes of content.</li>
            <li><strong>No Commercial Use</strong>: Content may not be used for commercial purposes without explicit permission.</li>
          </ul>
          <h2 className="text-2xl font-semibold mt-8 mb-4">3. Fanfiction & Copyright Disclaimer</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Nature of Content</strong>: FicNest hosts fan-created works based on existing copyrighted materials. These are transformative works created for entertainment purposes with no commercial intent.</li>
            <li><strong>No Affiliation</strong>: FicNest claims no ownership of original source materials. All rights belong to respective copyright holders.</li>
            <li><strong>Non-Commercial</strong>: This platform operates on a non-profit basis. Advertisement revenue covers only hosting and operational costs.</li>
            <li><strong>Immediate Compliance</strong>: We will immediately remove any content upon receiving valid legal notices from copyright holders or their representatives.</li>
          </ul>
          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Enforcement and Modifications</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Violations may lead to content removal, account suspension, or bans.</li>
            <li>FicNest may update these terms without prior notice. Continued use constitutes acceptance of the changes.</li>
          </ul>
          <p className="mt-8">If you have any questions or concerns about these terms and conditions, please contact us at <a href="mailto:terms@ficnest.com" className="text-primary hover:underline">terms@ficnest.com</a>.</p>
        </div>
      </div>
    </div>
  );
}