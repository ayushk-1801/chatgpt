"use client";

import * as React from "react";
import { Search, MessageSquare, Library, Zap, Bot, Crown } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import Image from "next/image";

// Mock chat data - replace with your actual data
const mockChats = [
  { id: 1, title: "Remote Internship Availability" },
  { id: 2, title: "Response to Job Inquiry" },
  { id: 3, title: "Writesonic Job Interest" },
  { id: 4, title: "AI Tutor Internship Resume" },
  { id: 5, title: "Full-Stack Outreach Message" },
  { id: 6, title: "Git PR Checkout Command" },
  { id: 7, title: "Full Stack Dev Bid" },
  { id: 8, title: "Advanced Web Dev Projects" },
  { id: 9, title: "Serialize Deserialize in Rust" },
  { id: 10, title: "500 Error Debugging OAuth" },
];

const mainMenuItems = [
  {
    title: "New chat",
    icon: MessageSquare,
    action: () => console.log("New chat clicked"),
  },
  {
    title: "Search chats",
    icon: Search,
    action: () => console.log("Search chats clicked"),
  },
  {
    title: "Library",
    icon: Library,
    action: () => console.log("Library clicked"),
  },
];

const additionalMenuItems = [
  {
    title: "Sora",
    icon: Zap,
    action: () => console.log("Sora clicked"),
  },
  {
    title: "GPTs",
    icon: Bot,
    action: () => console.log("GPTs clicked"),
  },
];

export function AppSidebar() {
  const [activeItem, setActiveItem] = React.useState<string | null>("Library");

  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
      className="border-none bg-neutral-900 text-white"
    >
      <SidebarHeader className="">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="logo" width={24} height={24} className="text-white dark:invert" />
          </div>
          <SidebarTrigger className="text-muted-foreground hover:text-white" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={activeItem === item.title}
                    onClick={() => setActiveItem(item.title)}
                    tooltip={item.title}
                    className="w-full text-white hover:bg-neutral-800 data-[active=true]:bg-neutral-800 focus:bg-neutral-800"
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {additionalMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={activeItem === item.title}
                    onClick={() => setActiveItem(item.title)}
                    tooltip={item.title}
                    className="w-full text-white hover:bg-neutral-800 data-[active=true]:bg-neutral-800 focus:bg-neutral-800"
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="text-neutral-400 text-xs font-medium px-2 py-1">
            Chats
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mockChats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    isActive={activeItem === `chat-${chat.id}`}
                    onClick={() => setActiveItem(`chat-${chat.id}`)}
                    className="w-full justify-start text-white hover:bg-neutral-800 data-[active=true]:bg-neutral-800 p-2 focus:bg-neutral-800"
                  >
                    <span className="text-sm truncate w-full text-left">
                      {chat.title}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-neutral-800">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeItem === "Upgrade plan"}
              onClick={() => setActiveItem("Upgrade plan")}
              tooltip="Upgrade plan"
              className="w-full text-white hover:bg-neutral-800 data-[active=true]:bg-neutral-800 focus:bg-neutral-800"
            >
              <Crown />
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">Upgrade plan</span>
                <span className="text-xs text-neutral-400">
                  More access to the best models
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export function AppSidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
      </div>
    </SidebarProvider>
  );
}
