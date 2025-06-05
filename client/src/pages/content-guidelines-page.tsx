import React from "react";
import { FileText, AlertTriangle } from "lucide-react";

export default function ContentGuidelinesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-6 flex items-center">
          <FileText className="mr-2" />
          Content Guidelines
        </h1>
        
        <p className="text-gray-600 mb-8">Effective Date: May 20, 2025</p>
        
        <div className="prose max-w-none">
          <p>
            These guidelines ensure FicNest remains a safe and enjoyable place for all readers and creators.
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">1. Community Standards</h2>
          
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Respectful Comments</strong>: Engage constructively. No hate speech, harassment, or personal attacks.
            </li>
            <li>
              <strong>No Spoilers Without Warning</strong>: Use spoiler tags or warnings.
            </li>
            <li>
              <strong>Stay on Topic</strong>: Comments should be relevant to the novel or chapter.
            </li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">2. Ratings & Reviews</h2>
          
          <ul className="list-disc pl-6 space-y-2">
            <li>Be fair and honest.</li>
            <li>Rate based on story quality, pacing, characters, etc.</li>
            <li>Do not manipulate ratings using multiple accounts.</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">3. Content Classifications</h2>
          
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Everyone</strong> – Safe for all ages.</li>
            <li><strong>Teen (13+)</strong> – Mild themes or language.</li>
            <li><strong>Mature (18+)</strong> – Contains adult themes or strong language. Labeled accordingly.</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">4. Prohibited Conduct</h2>
          
          <div className="bg-red-50 p-6 rounded-lg my-4 border-l-4 border-red-400">
            <ul className="list-disc pl-6 space-y-2 text-red-700">
              <li><strong>Scraping Content</strong>: Using bots or scripts to copy content is banned.</li>
              <li><strong>Unauthorized Distribution</strong>: Sharing FicNest content on other sites is forbidden.</li>
              <li><strong>Impersonation</strong>: Do not pose as authors or staff.</li>
              <li><strong>Spam</strong>: Promotional or repetitive posts will be removed.</li>
              <li><strong>Account Sharing</strong>: One account per user. Shared accounts may be suspended.</li>
            </ul>
          </div>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">5. Content Access</h2>
          
          <ul className="list-disc pl-6 space-y-2">
            <li>Premium content is currently not behind a paywall.</li>
            <li>Users must not attempt to extract or redistribute site content.</li>
            <li>Respect creators by engaging fairly with their work.</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">6. Reporting & Moderation</h2>
          
          <ul className="list-disc pl-6 space-y-2">
            <li>Use the report feature to flag rule violations.</li>
            <li>Do not engage with problematic users directly.</li>
            <li>Moderators may issue warnings, restrict access, or suspend accounts as needed.</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">7. Amendments</h2>
          
          <p>
            These guidelines may be updated. Continued use means you agree to follow any changes.
          </p>
          
          <div className="mt-8 p-6 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <p className="text-blue-700">
              These guidelines aim to create a positive reading environment where users can enjoy content while respecting 
              the work of creators and the experience of other readers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}