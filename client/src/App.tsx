// App.tsx - Updated to remove auth-callback route
import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./components/theme-provider";
import { useCopyProtection } from "@/hooks/use-copy-protection";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import NovelDetailPage from "@/pages/novel-detail-page";
import ChapterPage from "@/pages/chapter-page";
import SearchResultsPage from "@/pages/search-results-page";
import ProfilePage from "@/pages/profile-page";
import BookmarksPage from "@/pages/bookmarks-page";
import ReadingHistoryPage from "@/pages/reading-history-page";
import CreateNovelPage from "@/pages/create-novel-page";
import EditNovelPage from "@/pages/edit-novel-page";
import CreateChapterPage from "@/pages/create-chapter-page";
import AuthorDashboard from "@/pages/author-dashboard";
import EditChapterPage from "@/pages/edit-chapter-page";
import GenrePage from "@/pages/genre-page";
import TermsOfServicePage from "@/pages/terms-of-service-page";
import PrivacyPolicyPage from "@/pages/privacy-policy-page";
import CopyrightPolicyPage from "@/pages/copyright-policy-page";
import ContentGuidelinesPage from "@/pages/content-guidelines-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import AuthorProfilePage from "@/pages/author-profile-page";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

function Router() {
  const [location] = useLocation();
  const { isLoading } = useAuth();
  
  // Add the effect to scroll to top when location changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // Apply copy protection site-wide, but allow copying on specific elements
  useCopyProtection({
    allowSelectors: [
      'input', 
      'textarea', 
      '[contenteditable="true"]',
      '.comment-form', 
      '.code-block'
    ]
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="fixed bottom-4 right-4 z-50">
        
      </div>
      <main className="flex-grow">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-theme(space.16))] px-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <Switch>
            <Route path="/">
              {() => <HomePage />}
            </Route>
            
            <Route path="/auth">
              {() => <AuthPage />}
            </Route>
            
            <Route path="/novels/:id">
              <NovelDetailPage />
            </Route>
            
            <Route path="/novels/:novelId/chapters/:chapterNumber">
              <ChapterPage />
            </Route>
            
            {/* Genre Route */}
            <Route path="/genre/:genre">
              <GenrePage />
            </Route>
            
            {/* Search Route */}
            <Route path="/search">
              {() => <SearchResultsPage />}
            </Route>
            
            {/* Profile Route */}
            <Route path="/profile">
              {() => <ProfilePage />}
            </Route>
            
            {/* Bookmarks Route */}
            <Route path="/bookmarks">
              {() => <BookmarksPage />}
            </Route>
            
            {/* Reading History Route */}
            <Route path="/reading-history">
              {() => <ReadingHistoryPage />}
            </Route>

            <Route path="/authors/:id">
              {() => <AuthorProfilePage />}
            </Route>
            
            {/* Author Routes */}
            <ProtectedRoute path="/author/dashboard">
              <AuthorDashboard />
            </ProtectedRoute>
            
            <ProtectedRoute path="/author/novels/create">
              <CreateNovelPage />
            </ProtectedRoute>
            
            <ProtectedRoute path="/author/novels/:id/edit">
              <EditNovelPage />
            </ProtectedRoute>
            
            <ProtectedRoute path="/author/novels/:novelId/chapters/create">
              <CreateChapterPage />
            </ProtectedRoute>

            <ProtectedRoute path="/author/novels/:novelId/chapters/edit/:chapterId">
              <EditChapterPage />
            </ProtectedRoute>
            
            {/* Legal Pages Routes */}
            <Route path="/terms">
              {() => <TermsOfServicePage />}
            </Route>
            
            <Route path="/privacy">
              {() => <PrivacyPolicyPage />}
            </Route>
            
            <Route path="/copyright">
              {() => <CopyrightPolicyPage />}
            </Route>
            
            <Route path="/guidelines">
              {() => <ContentGuidelinesPage />}
            </Route>
            
            <Route>
              {() => <NotFound />}
            </Route>
          </Switch>
        )}
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Toaster />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;