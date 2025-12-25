import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-blue-600 text-white shadow hover:bg-blue-500",
        success:
          "border-transparent bg-green-600 text-white shadow hover:bg-green-500",
        warning:
          "border-transparent bg-yellow-600 text-white shadow hover:bg-yellow-500",
        secondary:
          "border-transparent bg-white-600 text-white hover:bg-white-500",
        destructive:
          "border-transparent bg-red-600 text-white shadow hover:bg-red-500",
        outline: "border-gray-600 text-gray-300 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants };

