"use client";

import * as React from "react";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "./ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { mainModels, moreModels } from "@/lib/models";

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
          className="w-6 h-6 rounded-full hover:opacity-80 transition-opacity"
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
          <DropdownMenuItem className="rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-[#515151] dark:hover:bg-[#606060] p-2 cursor-pointer transition-colors text-sm">
            <Crown className="w-4 h-4 mr-2" />
            <span>Upgrade plan</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="rounded-md hover:bg-neutral-100 dark:hover:bg-[#515151] p-2 cursor-pointer transition-colors text-sm">
            <Palette className="w-4 h-4 mr-2" />
            <span>Customize ChatGPT</span>
          </DropdownMenuItem>

          <DropdownMenuItem className="rounded-md hover:bg-neutral-100 dark:hover:bg-[#515151] p-2 cursor-pointer transition-colors text-sm">
            <Settings className="w-4 h-4 mr-2" />
            <span>Settings</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1 bg-border" />

          <DropdownMenuItem className="rounded-md hover:bg-neutral-100 dark:hover:bg-[#515151] p-2 cursor-pointer transition-colors text-sm flex items-center justify-between">
            <div className="flex items-center">
              <HelpCircle className="w-4 h-4 mr-2" />
              <span>Help</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </DropdownMenuItem>

          <DropdownMenuItem
            className="rounded-md hover:bg-neutral-100 dark:hover:bg-[#515151] p-2 cursor-pointer transition-colors text-sm"
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
  const [selectedModel, setSelectedModel] = React.useState("gpt-4o");

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
  };

  const allModels = [...mainModels, ...moreModels];
  const currentModel = allModels.find((m) => m.model === selectedModel);

  return (
    <header className="flex items-center justify-between px-3 py-2 bg-background dark:bg-[#212121] text-foreground">
      <TooltipProvider delayDuration={100}>
        {/* Left side - ChatGPT with model selection */}
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                          <Button
              variant="ghost"
              className="flex items-center space-x-0 hover:bg-neutral-100 dark:hover:bg-[#515151] px-2 py-1 rounded-lg transition-colors focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-none focus:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <span className="text-lg font-medium">
                ChatGPT
                <span className="text-muted-foreground ml-1">
                  {currentModel?.displayName}
                </span>
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-64 rounded-xl bg-white dark:bg-[#303030] p-2 shadow-2xl border-none"
            >
              <div className="flex items-center gap-2 px-2 py-1 mb-1">
                <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Models</span>
                <div className="w-4 h-4 rounded-full bg-neutral-300 dark:bg-neutral-600 flex items-center justify-center">
                  <span className="text-xs text-neutral-600 dark:text-neutral-300">?</span>
                </div>
              </div>
              
              {mainModels.map((model) => (
                <DropdownMenuItem
                  key={model.model}
                  className="rounded-md hover:bg-neutral-100 dark:hover:bg-[#515151] p-2 cursor-pointer transition-colors flex items-center justify-between"
                  onClick={() => handleModelSelect(model.model)}
                >
                  <div>
                    <div className="font-medium text-sm">{model.displayName}</div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400">
                      {model.description}
                    </div>
                  </div>
                  {selectedModel === model.model && (
                    <div className="w-4 h-4 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-neutral-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="rounded-md hover:bg-neutral-100 dark:hover:bg-[#515151] p-2 cursor-pointer transition-colors">
                  <span className="font-medium text-sm">More models</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-64 rounded-xl bg-white dark:bg-[#303030] p-2 shadow-2xl border-none">
                  <div className="flex items-center gap-2 px-2 py-1 mb-1">
                    <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                      More models
                    </span>
                  </div>
                  {moreModels.map((model) => (
                    <DropdownMenuItem
                      key={model.model}
                      className="rounded-md hover:bg-neutral-100 dark:hover:bg-[#515151] p-2 cursor-pointer transition-colors flex items-center justify-between"
                      onClick={() => handleModelSelect(model.model)}
                    >
                      <div>
                        <div className="font-medium text-sm">{model.displayName}</div>
                        <div className="text-xs text-neutral-600 dark:text-neutral-400">
                          {model.description}
                        </div>
                      </div>
                      {selectedModel === model.model && (
                        <div className="w-4 h-4 flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-neutral-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
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
                  className="bg-white text-black hover:bg-neutral-100 px-4 py-1.5 rounded-full transition-colors font-medium text-sm"
                >
                  Log in
                </Button>
              </SignInButton>

              <SignInButton>
                <Button
                  variant="outline"
                  className="border-neutral-600 text-white hover:bg-neutral-100 hover:text-black px-4 py-1.5 rounded-full transition-colors font-medium text-sm"
                >
                  Sign up for free
                </Button>
              </SignInButton>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-1.5 hover:bg-neutral-100 dark:hover:bg-[#515151] rounded-lg transition-colors"
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
                  className="p-1.5 hover:bg-neutral-100 dark:hover:bg-[#515151] rounded-lg transition-colors"
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
