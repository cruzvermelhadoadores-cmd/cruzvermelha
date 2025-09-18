import { useAuth, useLogout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useLocation, Link } from "wouter";

export default function Header() {
  const { data: authData } = useAuth();
  const logout = useLogout();
  const [, setLocation] = useLocation();

  const user = authData?.user;

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
      setLocation("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div
            className="flex items-center space-x-4 cursor-pointer"
            onClick={() => setLocation("/")}
            data-testid="header-logo"
          >
            <div className="flex items-center space-x-1">
              <img
                src="https://imgur.com/V4f4OIL.jpg"
                alt="Cruz Vermelha Angola"
                className="h-10 w-10 object-contain"
              />
              <div>
                <div className="flex space-x-2">
                  <h1 className="text-base sm:text-lg font-semibold text-foreground hidden sm:block">
                    Cruz
                  </h1>
                  <h1 className="text-base sm:text-lg font-semibold text-foreground">
                    Vermelha
                  </h1>
                </div>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Sistema de Doadores
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 ">
            <span
              className="text-sm text-muted-foreground hidden sm:block"
              data-testid="text-user-name"
            >
              {user?.name}
            </span>
            <span
              className="inline-flex items-center py-1 text-xs font-medium bg-primary/10 text-primary rounded-full  hidden sm:block"
              data-testid="text-user-role"
            >
              {user?.role === "admin" ? "Admin" : "lider"}
            </span>
            {user?.role === "admin" && (
                <>
                  <Link
                    to="/reports"
                    className="text-foreground/80 hover:text-foreground px-2 py-1 rounded-md text-sm font-medium transition-colors"
                  >
                    Relatórios
                  </Link>
                  <Link
                    to="/users"
                    className="text-foreground/80 hover:text-foreground px-2 py-1 rounded-md text-sm font-medium transition-colors"
                  >
                    Usuários
                  </Link>
                </>
              )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={logout.isPending}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}