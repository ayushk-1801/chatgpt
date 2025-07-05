"use client";

import * as React from "react";
import { Search, MessageSquare, Library, Zap, Bot, Crown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

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

interface ChatData {
  _id: string;
  slug: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

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
  const [chats, setChats] = React.useState<ChatData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { user } = useUser();
  const router = useRouter();

  // Fetch chats from database
  React.useEffect(() => {
    const fetchChats = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('/api/chats');
        if (response.ok) {
          const chatData = await response.json();
          setChats(chatData);
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChats();
  }, [user]);

  const handleNewChat = () => {
    // Generate a random slug for new chat
    const newSlug = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    router.push(`/c/${newSlug}`);
  };

  const handleChatClick = (chat: ChatData) => {
    setActiveItem(`chat-${chat._id}`);
    router.push(`/c/${chat.slug}`);
  };

  const updatedMainMenuItems = mainMenuItems.map(item => 
    item.title === "New chat" 
      ? { ...item, action: handleNewChat }
      : item
  );

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
              {updatedMainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={activeItem === item.title}
                    onClick={() => {
                      setActiveItem(item.title);
                      item.action();
                    }}
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
              {isLoading ? (
                <SidebarMenuItem>
                  <div className="px-2 py-1 text-sm text-neutral-400">
                    Loading chats...
                  </div>
                </SidebarMenuItem>
              ) : chats.length === 0 ? (
                <SidebarMenuItem>
                  <div className="px-2 py-1 text-sm text-neutral-400">
                    No chats yet
                  </div>
                </SidebarMenuItem>
              ) : (
                chats.map((chat) => (
                  <SidebarMenuItem key={chat._id}>
                    <SidebarMenuButton
                      isActive={activeItem === `chat-${chat._id}`}
                      onClick={() => handleChatClick(chat)}
                      className="w-full justify-start text-white hover:bg-neutral-800 data-[active=true]:bg-neutral-800 p-2 focus:bg-neutral-800"
                    >
                      <span className="text-sm truncate w-full text-left">
                        {chat.title}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
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
