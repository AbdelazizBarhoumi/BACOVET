import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className="h-7 w-7 p-0"
      aria-label="Basculer le thème"
    >
      {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </Button>
  );
}

export default ThemeToggle;
