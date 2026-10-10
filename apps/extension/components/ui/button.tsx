import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// DESIGN.md › Components: chunky rounded buttons with a 4px lip in a darker shade that
// disappears as the button presses down. Text buttons use the uppercase button type.
const lip = "shadow-[0_4px_0_var(--lip)] active:not-disabled:translate-y-1 active:not-disabled:shadow-none"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding type-button whitespace-nowrap transition-[transform,box-shadow,background-color,filter] duration-75 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: `bg-primary text-primary-foreground [--lip:var(--primary-pressed)] hover:brightness-105 ${lip}`,
        jade: `bg-jade text-white [--lip:var(--brand-jade-pressed)] hover:brightness-105 dark:text-background ${lip}`,
        outline: `border-2 border-border bg-background text-harbour-ink [--lip:var(--border)] hover:bg-muted aria-expanded:bg-muted ${lip}`,
        secondary: `border-2 border-border bg-secondary text-secondary-foreground [--lip:var(--border)] hover:bg-muted aria-expanded:bg-muted ${lip}`,
        ghost: "text-harbour-ink hover:bg-muted aria-expanded:bg-muted",
        destructive: "bg-primary-soft text-destructive hover:brightness-95",
        link: "text-harbour-ink underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[46px] gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-7 gap-1 rounded-md px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-md px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-6 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-[34px] rounded-md",
        "icon-xs": "size-6 rounded-sm [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-md",
        "icon-lg": "size-10 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
