import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[transform,box-shadow,background-color,border-color,color] duration-300 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ox",
  {
    variants: {
      variant: {
        primary:
          "bg-ox text-oxink shadow-[0_12px_28px_-12px_color-mix(in_oklab,var(--color-ox)_80%,transparent)] hover:-translate-y-0.5 hover:bg-ink hover:shadow-[0_18px_32px_-14px_color-mix(in_oklab,var(--color-ink)_45%,transparent)]",
        line: "float-glass text-ink hover:-translate-y-0.5 hover:border-ox",
        ghost: "bg-transparent text-ink hover:bg-line",
        ink: "bg-ink text-paper hover:bg-ox",
      },
      size: {
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, type, ...props }: Props) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      type={asChild ? undefined : (type ?? "button")}
      {...props}
    />
  );
}
