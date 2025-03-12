
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import IndexPage from "./pages/home/IndexPage";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Search from "./pages/Search";
import Resume from "./pages/Resume";
import ResumeManager from "./pages/ResumeManager";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import Evaluation from "./pages/Evaluation";
import { Toaster } from "@/components/ui/toaster";
import "./App.css";

// Initialize dark mode based on saved preference, defaulting to dark mode
const initDarkMode = () => {
  if (localStorage.theme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    // Default to dark mode
    document.documentElement.classList.add('dark');
    if (!('theme' in localStorage)) {
      localStorage.theme = 'dark';
    }
  }
};

// Dark mode initializer component
const DarkModeInitializer = () => {
  useEffect(() => {
    initDarkMode();
  }, []);
  
  return null;
};

function App() {
  return (
    <Router>
      <DarkModeInitializer />
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/resumes" element={<ResumeManager />} />
        <Route path="/search" element={<Search />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/help" element={<Help />} />
        <Route path="/evaluation" element={<Evaluation />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
