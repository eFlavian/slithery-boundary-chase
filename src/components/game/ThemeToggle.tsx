
import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="fixed top-4 left-4 p-2 rounded-lg bg-gray-200/80 dark:bg-gray-700/80 border-2 border-gray-300 dark:border-gray-600 z-[999]"
    >
      {theme === 'dark' ? (
        <Sun className="w-6 h-6 text-gray-700 dark:text-gray-200" />
      ) : (
        <Moon className="w-6 h-6 text-gray-700 dark:text-gray-200" />
      )}
    </button>
  );
};

export default ThemeToggle;
