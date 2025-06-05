import { useEffect, useState } from 'react';
import { enable, disable } from 'darkreader';
import { Switch } from "@/components/ui/switch";
import { Moon, Sun } from "lucide-react";

const DarkMode = () => {
  // Read initial state from localStorage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'enabled';
  });

  useEffect(() => {
    // Function to enable dark mode
    const enableDarkMode = async () => {
      try {
        await enable({
          brightness: 90, // Slightly reduced brightness
          contrast: 95, // Increased contrast
          sepia: 10,
          // Adjusting specific colors for background and text might be needed for finer control
          // For now, let's rely on brightness/contrast to handle the general look
        });
      } catch (e) {
        console.error('Failed to enable dark mode:', e);
      }
    };

    // Function to disable dark mode
    const disableDarkMode = () => {
      disable();
    };

    // Apply dark mode based on state and save to localStorage
    if (isDarkMode) {
      enableDarkMode();
      localStorage.setItem('darkMode', 'enabled');
    } else {
      disableDarkMode();
      localStorage.setItem('darkMode', 'disabled');
    }

    // Cleanup on component unmount
    return () => {
      disableDarkMode();
    };
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className="flex items-center gap-2">
      <Sun className="h-4 w-4" />
      <Switch
        checked={isDarkMode}
        onCheckedChange={toggleDarkMode}
        aria-label="Toggle dark mode"
      />
      <Moon className="h-4 w-4" />
    </div>
  );
};

export default DarkMode; 