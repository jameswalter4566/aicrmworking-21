import React from "react"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ModeToggle } from "@/components/ModeToggle"
import { useAuth } from "@/context/AuthContext"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Home,
  LayoutDashboard,
  Menu,
  Plus,
  Settings,
  User,
  HelpCircle,
  LogOut,
  Phone
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  )
})
ListItem.displayName = "ListItem"

interface NavItem {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
}

const navigationItems: NavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    label: "Contacts",
    icon: User,
    href: "/contacts",
  },
  {
    label: "Deals",
    icon: Home,
    href: "/deals",
  },
  {
    label: "Pitch Decks",
    icon: Plus,
    href: "/pitch-decks",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/settings",
  },
  {
    label: "Help",
    icon: HelpCircle,
    href: "/help",
  },
  {
    label: "Phone",
    icon: Phone,
    href: "/phone",
  },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
      toast.success("Logged out successfully!");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to log out.");
    }
  };

  return (
    <div className="border-r h-full">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="p-0 px-2">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:w-64">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>
              Navigate through the application.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 mt-4">
            {navigationItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={`flex items-center space-x-2 rounded-md p-2 hover:bg-secondary ${location.pathname === item.href ? 'bg-secondary' : ''}`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
          <SheetFooter>
            <Button onClick={handleLogout} variant="destructive" className="w-full mt-4">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <div className="flex flex-col h-full">
        <div className="px-4 py-6">
          <NavigationMenu>
            <NavigationMenuList>
              {navigationItems.map((item) => (
                <NavigationMenuItem key={item.label}>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    <Link
                      to={item.href}
                      className={`flex items-center space-x-2 rounded-md p-2 hover:bg-secondary ${location.pathname === item.href ? 'bg-secondary' : ''}`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        <div className="mt-auto px-4 py-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left">
                  <span className="font-semibold">{user?.user_metadata?.full_name || user?.email}</span>
                  <span className="text-sm text-muted-foreground">{user?.email}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end">
              <DropdownMenuItem>
                <Link to="/settings" className="w-full">
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ModeToggle />
        </div>
      </div>
    </div>
  )
}

interface SheetFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const SheetFooter = React.forwardRef<HTMLDivElement, SheetFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2" ref={ref} {...props}>
      {children}
    </div>
  )
)
SheetFooter.displayName = "SheetFooter"
