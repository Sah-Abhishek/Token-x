
import { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className, children, ...props }) => {
  return (
    <button
      className={clsx(
        'px-6 py-2 rounded-lg transition-all duration-200',
        variant === 'primary' ? 'bg-black text-white hover:bg-gray-800' : 'border border-gray-300 hover:bg-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
