import { Link } from "wouter";
import { BookOpen } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between">
          <div className="mb-6 md:mb-0">
            <div className="text-primary-dark font-bold text-xl mb-4 flex items-center">
              <BookOpen className="mr-2" />
              <span>FicNest</span>
            </div>
            <p className="text-muted-foreground max-w-xs">
              A community-driven platform for web novel enthusiasts to read, write, and connect.
            </p>
          </div>
          
          {/* Discord link in the middle */}
          <div className="flex items-center justify-center mb-6 md:mb-0 md:mx-8">
            <a 
              href="https://discord.gg/your-discord-invite" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary hover:text-primary-dark transition py-3 px-6 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="28" 
                height="28" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className="mr-3"
              >
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
              </svg>
              <span className="text-lg font-medium">Join our Discord community</span>
            </a>
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-gray-900 font-semibold mb-4">Account</h3>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="/profile" className="hover:text-primary transition">My Profile</Link></li>
                <li><Link href="/bookmarks" className="hover:text-primary transition">Bookmarks</Link></li>
                <li><Link href="/reading-history" className="hover:text-primary transition">Reading History</Link></li>
                <li><Link href="/ranking" className="hover:text-primary transition">Ranking Page</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-gray-900 font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="/terms" className="hover:text-primary transition">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-primary transition">Privacy Policy</Link></li>
                <li><Link href="/copyright" className="hover:text-primary transition">Copyright Policy</Link></li>
                <li><Link href="/guidelines" className="hover:text-primary transition">Content Guidelines</Link></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="pt-8 mt-8 border-t border-border text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} FicNest - All rights reserved.</p>
          <p className="mt-2 text-xs text-gray-500">
            Disclaimer: This is a fanfiction website. All original characters, plots, and worlds belong to their respective copyright holders. No copyright infringement is intended. Content will be removed upon request by copyright holders.
          </p>
        </div>
      </div>
    </footer>
  );
}