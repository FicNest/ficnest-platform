import React from "react";
import { Copyright } from "lucide-react";

export default function CopyrightPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-6 flex items-center">
          <Copyright className="mr-2" />
          DMCA Policy
        </h1>
        
        <p className="text-gray-600 mb-8">Effective Date: May 20, 2025</p>
        
        <div className="prose max-w-none">
          <p className="mb-6">
            We take the intellectual property rights of others seriously and require that our Users do the same. 
            The Digital Millennium Copyright Act (DMCA) established a process for addressing claims of copyright 
            infringement. If you own a copyright or have authority to act on behalf of a copyright owner and want 
            to report a claim that a third party is infringing that material on or through FicNest's services, 
            please submit a DMCA report on our Contact page, and we will take appropriate action.
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">DMCA Report requirements</h2>
          
          <ol className="list-decimal pl-6 space-y-2 mb-6">
            <li>A description of the copyrighted work that you claim is being infringed;</li>
            <li>A description of the material you claim is infringing and that you want removed or access to which you want disabled and the URL or other location of that material;</li>
            <li>Your name, title (if acting as an agent), address, telephone number, and email address;</li>
            <li>The following statement: "I have a good faith belief that the use of the copyrighted material I am complaining of is not authorized by the copyright owner, its agent, or the law (e.g., as a fair use)";</li>
            <li>The following statement: "The information in this notice is accurate and, under penalty of perjury, I am the owner, or authorized to act on behalf of the owner, of the copyright or of an exclusive right that is allegedly infringed";</li>
            <li>An electronic or physical signature of the owner of the copyright or a person authorized to act on the owner's behalf.</li>
          </ol>
          
          <div className="bg-gray-100 p-6 rounded-lg my-6">
            <p className="font-medium">
              Your DMCA take down request should be submitted here: <a href="https://ficnest.com/contact" className="text-primary hover:underline">https://ficnest.com/contact</a>
            </p>
            <p className="mt-2">
              We will then review your DMCA request and take proper actions, including removal of the content from the website.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}