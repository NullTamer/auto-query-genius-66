
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AuthButtonProps {
  session: any | null;
}

const AuthButton = ({ session }: AuthButtonProps) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Signed out successfully');
      navigate('/auth');
    } catch (error) {
      toast.error('Failed to sign out');
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="flex justify-end p-4">
      {!session ? (
        <Button 
          variant="outline" 
          onClick={() => navigate('/auth')}
          className="cyber-card flex items-center gap-2 hover:neon-glow transition-all"
        >
          <LogIn className="h-4 w-4" />
          Sign In
        </Button>
      ) : (
        <Button 
          variant="outline" 
          onClick={handleSignOut}
          className="cyber-card flex items-center gap-2 hover:neon-glow transition-all"
        >
          Sign Out
        </Button>
      )}
    </div>
  );
};

export default AuthButton;
