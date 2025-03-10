import { AlertCircle, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface ComponentProps {
  title?: string | JSX.Element;
  description?: string | JSX.Element;
  Icon?: LucideIcon;
  variant?: 'default' | 'destructive';
}

type RequiredProps =
  | { title: string | JSX.Element; description?: string | JSX.Element }
  | { title?: string | JSX.Element; description: string | JSX.Element };

type AppAlertProps = ComponentProps & RequiredProps;

const AppAlert = ({
  title,
  description,
  Icon,
  variant = 'default',
}: AppAlertProps) => {
  if (!title && !description) {
    throw new Error('Either title or description must be provided.');
  }

  return (
    <Alert
      variant={variant}
      className={cn(
        'flex items-start gap-2',
        variant === 'destructive' && 'bg-red-100'
      )}
    >
      <div className="flex-shrink-0">
        {Icon ? (
          <Icon className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
      </div>
      <div className="flex flex-col justify-center">
        {title && <AlertTitle>{title}</AlertTitle>}
        {description && <AlertDescription>{description}</AlertDescription>}
      </div>
    </Alert>
  );
};

export default AppAlert;
