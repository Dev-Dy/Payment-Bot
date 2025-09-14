import ThemeToggle from '../ThemeToggle';
import { ThemeProvider } from '../ThemeProvider';

export default function ThemeToggleExample() {
  return (
    <ThemeProvider>
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Theme:</span>
          <ThemeToggle />
        </div>
      </div>
    </ThemeProvider>
  );
}