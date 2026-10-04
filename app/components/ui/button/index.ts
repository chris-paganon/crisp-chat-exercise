import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

export { default as Button } from "./Button.vue";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-base leading-none font-medium transition-[color,background-color,box-shadow] motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary bg-linear-to-b from-primary-foreground/15 to-primary-foreground/0 text-primary-foreground shadow-button hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border-border bg-transparent text-secondary-foreground dark:text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary:
          "border-border bg-secondary text-secondary-foreground shadow-xs hover:bg-muted dark:hover:bg-secondary/90",
        ghost:
          "text-secondary-foreground dark:text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        "default": "h-10 px-4 py-2",
        "sm": "h-9 gap-1.5 rounded-sm px-3 text-sm",
        "lg": "h-12.5 rounded-lg px-5",
        "icon": "size-10",
        "icon-sm": "size-9 rounded-sm",
        "icon-lg": "size-12.5 rounded-lg",
      },
    },
    compoundVariants: [
      {
        variant: "link",
        class: "h-auto rounded-none border-0 p-0 shadow-none",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
export type ButtonVariants = VariantProps<typeof buttonVariants>;
