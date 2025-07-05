"use client";

import {
  SignedIn,
  SignInButton,
  SignedOut,
  useUser,
  useClerk,
} from "@clerk/nextjs";
import {
  ChevronDown,
  Settings,
  HelpCircle,
  Crown,
  Palette,
  LogOut,
  User,
  ChevronRight,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

function CustomUserProfile() {
  const { user } = useUser();
  const { signOut } = useClerk();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 rounded-full hover:opacity-80 transition-opacity"
        >
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.fullName || "Profile"}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-4 h-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 rounded-xl bg-white dark:bg-[#303030] p-2 shadow-2xl border-none overflow-hidden"
      >
        {/* User Info Header */}
        <div className="flex items-center gap-2 p-2 mb-1">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {user.primaryEmailAddress?.emailAddress}
          </span>
        </div>

        {/* Menu Items */}
        <div className="space-y-1">
          <DropdownMenuItem className="rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-[#515151] dark:hover:bg-[#606060] p-2 cursor-pointer transition-colors text-sm">
            <Crown className="w-4 h-4 mr-2" />
            <span>Upgrade plan</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="rounded-md hover:bg-gray-100 dark:hover:bg-[#515151] p-2 cursor-pointer transition-colors text-sm">
            <Palette className="w-4 h-4 mr-2" />
            <span>Customize ChatGPT</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="rounded-md hover:bg-gray-100 dark:hover:bg-[#515151] p-2 cursor-pointer transition-colors text-sm">
            <Settings className="w-4 h-4 mr-2" />
            <span>Settings</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1 bg-border" />

          <DropdownMenuItem className="rounded-md hover:bg-gray-100 dark:hover:bg-[#515151] p-2 cursor-pointer transition-colors text-sm flex items-center justify-between">
            <div className="flex items-center">
              <HelpCircle className="w-4 h-4 mr-2" />
              <span>Help</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </DropdownMenuItem>

          <DropdownMenuItem
            className="rounded-md hover:bg-gray-100 dark:hover:bg-[#515151] p-2 cursor-pointer transition-colors text-sm"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span>Log out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-background dark:bg-[#212121] text-foreground">
      <TooltipProvider delayDuration={100}>
        {/* Left side - ChatGPT with dropdown */}
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-[#515151] px-2 py-1 rounded-lg transition-colors"
              >
                <span className="text-lg font-medium">ChatGPT</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-56 rounded-xl bg-white dark:bg-[#303030] p-2 shadow-2xl border-none"
            >
              <DropdownMenuItem className="rounded-md hover:bg-gray-100 dark:hover:bg-[#515151] p-2 cursor-pointer transition-colors">
                <span>ChatGPT</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md hover:bg-gray-100 dark:hover:bg-[#515151] p-2 cursor-pointer transition-colors">
                <span>GPT-4</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md hover:bg-gray-100 dark:hover:bg-[#515151] p-2 cursor-pointer transition-colors">
                <span>GPT-3.5</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right side - Settings and Auth */}
        <div className="flex items-center space-x-2">
          <SignedOut>
            <div className="flex items-center space-x-2">
              <SignInButton>
                <Button
                  variant="secondary"
                  className="bg-white text-black hover:bg-gray-100 px-4 py-1.5 rounded-full transition-colors font-medium text-sm"
                >
                  Log in
                </Button>
              </SignInButton>

              <SignInButton>
                <Button
                  variant="outline"
                  className="border-gray-600 text-white hover:bg-gray-100 hover:text-black px-4 py-1.5 rounded-full transition-colors font-medium text-sm"
                >
                  Sign up for free
                </Button>
              </SignInButton>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#515151] rounded-lg transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="rounded-md bg-white dark:bg-[#303030] p-1.5 shadow-md border-none">
                  <p>Help & FAQ</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </SignedOut>

          <SignedIn>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#515151] rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="rounded-md bg-white dark:bg-[#303030] p-1.5 shadow-md border-none">
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>

            <CustomUserProfile />
          </SignedIn>
        </div>
      </TooltipProvider>
    </header>
  );
}
