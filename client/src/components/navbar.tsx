// client/src/components/navbar.tsx
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Menu, X, BookOpen, ChevronDown, LogOut, User, BookmarkIcon, History, BookPlus, PenSquare, Search, Tag } from "lucide-react";
import { AuthModal } from "@/components/auth-modal"; // Import the AuthModal component
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DarkMode from "@/components/DarkMode";

export default function Navbar() {
  const { user, logoutMutation } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [location, navigate] = useLocation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState("login");
  
  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);
  
  // Update search input when URL changes (to sync with URL query parameter)
  useEffect(() => {
    if (location.startsWith('/search')) {
      try {
        const params = new URLSearchParams(window.location.search);
        const query = params.get('q');
        if (query) {
          setSearchQuery(query);
        }
      } catch (error) {
        console.error("Error parsing search query:", error);
      }
    } else {
      // Clear search input when navigating away from search
      setSearchQuery("");
    }
  }, [location]);
  
  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate("/");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const newSearchUrl = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
      
      // If we're already on the search page but with different query, we 
      // need to force a refresh to trigger the search
      if (location.startsWith('/search')) {
        // Use window.location to force a full page reload
        window.location.href = newSearchUrl;
      } else {
        // Otherwise, just navigate normally
        navigate(newSearchUrl);
      }
    }
  };
  
  // Handle logo click to always refresh the page
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Force a full page reload regardless of where we are
    window.location.href = '/';
  };

  // Function to open auth modal with specific tab
  const openAuthModal = (tab: string) => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  return (
    <header className="bg-background shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          {/* Logo on the left */}
          <a
            href="/"
            className="flex items-center space-x-2"
            onClick={handleLogoClick}
          >
            <div className="text-primary-dark font-bold text-2xl flex items-center">
              <BookOpen className="mr-2" />
              <span>FicNest</span>
            </div>
          </a>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex mx-4 flex-grow items-center gap-4">
            <form onSubmit={handleSearch} className="w-full flex gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search by title, author, or tags..."
                  className="pl-10 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button type="submit">
                Search
              </Button>
            </form>
          </div>

          {/* Mobile Dark Mode Toggle and Menu Button */}
          <div className="flex items-center md:hidden gap-2">
            <DarkMode />
            <button 
              onClick={toggleMenu} 
              className="text-gray-500 hover:text-gray-700" 
              aria-label="Open menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {/* Login/Register for non-logged-in users */}
            {!user ? (
              <div className="flex space-x-3 items-center">
                <Button 
                  variant="outline" 
                  onClick={() => openAuthModal("login")}
                >
                  Log In
                </Button>
                <Button 
                  onClick={() => openAuthModal("register")}
                >
                  Register
                </Button>
              </div>
            ) : (
              /* User dropdown for logged-in users with logo */
              <div className="flex items-center gap-4">
                <DarkMode />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-white">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.username}</span>
                      <ChevronDown size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/bookmarks" className="cursor-pointer">
                        <BookmarkIcon className="mr-2 h-4 w-4" />
                        My Bookmarks
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/reading-history" className="cursor-pointer">
                        <History className="mr-2 h-4 w-4" />
                        Reading History
                      </Link>
                    </DropdownMenuItem>
                    
                    {/* Author-only menu items */}
                    {user.isAuthor && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/author/dashboard" className="cursor-pointer">
                            <BookOpen className="mr-2 h-4 w-4" />
                            My Novels
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/author/novels/create" className="cursor-pointer">
                            <BookPlus className="mr-2 h-4 w-4" />
                            Create Novel
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </nav>
        </div>
      </div>
      
      {/* Mobile Navigation (hidden by default) */}
      <nav 
        className={`bg-white py-4 px-4 md:hidden ${isOpen ? 'block' : 'hidden'}`}
      >
        {/* Search Bar - Mobile */}
        <form onSubmit={handleSearch} className="mb-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <Input 
              type="text"
              placeholder="Search by title, author, or tags..."
              className="flex-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </form>

        <div className="flex flex-col space-y-3">
          {user && (
            <>
              <div className="py-2 font-medium text-foreground">Account</div>
              <Link href="/profile" onClick={closeMenu} className="text-gray-700 hover:text-primary-dark py-2 pl-2">
                Profile
              </Link>
              <Link href="/bookmarks" onClick={closeMenu} className="text-gray-700 hover:text-primary-dark py-2 pl-2">
                My Bookmarks
              </Link>
              <Link href="/reading-history" onClick={closeMenu} className="text-gray-700 hover:text-primary-dark py-2 pl-2">
                Reading History
              </Link>
              
              {user.isAuthor && (
                <>
                  <div className="py-2 font-medium text-gray-700">Author</div>
                  <Link href="/author/dashboard" onClick={closeMenu} className="text-gray-700 hover:text-primary-dark py-2 pl-2">
                    My Novels
                  </Link>
                  <Link href="/author/novels/create" onClick={closeMenu} className="text-gray-700 hover:text-primary-dark py-2 pl-2">
                    Create Novel
                  </Link>
                </>
              )}
              
              <button 
                onClick={() => {
                  closeMenu();
                  handleLogout();
                }} 
                className="text-red-600 hover:text-red-800 py-2"
              >
                Log Out
              </button>
            </>
          )}
          
          {!user && (
            <>
              <hr className="my-2" />
              <Button 
                className="w-full"
                onClick={() => {
                  closeMenu();
                  openAuthModal("login");
                }}
              >
                Log In
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  closeMenu();
                  openAuthModal("register");
                }}
              >
                Register
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Auth Modal Component */}
      <AuthModal 
        isOpen={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultTab={authModalTab}
      />
    </header>
  );
}