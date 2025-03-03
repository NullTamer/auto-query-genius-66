
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Context for sidebar state
type SidebarContextType = {
  isOpen: boolean
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined)

function useSidebarContext() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("Sidebar components must be used within a SidebarProvider")
  }
  return context
}

// Provider for sidebar state
export function SidebarProvider({
  children,
  defaultOpen = false,
}: {
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  )
}

// Trigger button to toggle sidebar
export function SidebarTrigger({ className }: { className?: string }) {
  const { isOpen, setIsOpen } = useSidebarContext()

  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        "p-2 rounded-md hover:bg-primary/10 transition-colors",
        className
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-menu"
      >
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="18" y2="18" />
      </svg>
    </button>
  )
}

// Main sidebar component
const sidebarVariants = cva(
  "h-screen transition-all duration-300 ease-in-out border-r z-20",
  {
    variants: {
      open: {
        true: "min-w-[240px] max-w-[240px]",
        false: "min-w-[80px] max-w-[80px]",
      },
    },
    defaultVariants: {
      open: true,
    },
  }
)

interface SidebarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sidebarVariants> {
  collapsible?: boolean
}

export function Sidebar({
  className,
  children,
  collapsible = true,
  ...props
}: SidebarProps) {
  const { isOpen } = useSidebarContext()

  return (
    <aside
      className={cn(sidebarVariants({ open: isOpen }), className)}
      {...props}
    >
      <div className="h-full flex flex-col">{children}</div>
    </aside>
  )
}

// Sidebar header
export function SidebarHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("h-14 flex items-center px-4 border-b", className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Sidebar content
export function SidebarContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 flex flex-col overflow-auto p-2", className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Sidebar footer
export function SidebarFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-t p-2", className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Sidebar group
export function SidebarGroup({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("pb-2", className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Sidebar group label
export function SidebarGroupLabel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isOpen } = useSidebarContext()

  return (
    <div
      className={cn(
        "text-xs uppercase font-semibold tracking-wider text-muted-foreground px-3 py-2",
        isOpen ? "text-left" : "text-center",
        className
      )}
      {...props}
    >
      {isOpen ? children : null}
    </div>
  )
}

// Sidebar group content
export function SidebarGroupContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("", className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Sidebar menu
export function SidebarMenu({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      className={cn("space-y-1", className)}
      {...props}
    >
      {children}
    </ul>
  )
}

// Sidebar menu item
export function SidebarMenuItem({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li
      className={cn("", className)}
      {...props}
    >
      {children}
    </li>
  )
}

// Sidebar menu button
export function SidebarMenuButton({
  className,
  children,
  asChild = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
}) {
  const { isOpen } = useSidebarContext()
  const Comp = asChild ? "div" : "button"

  return (
    <Comp
      className={cn(
        "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-primary/10 transition-colors",
        isOpen ? "justify-start" : "justify-center",
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child, index) => {
        if (!isOpen && index > 0) return null
        return child
      })}
    </Comp>
  )
}
