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

  const fetchChats = React.useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/chats');
      if (response.ok) {
        const result = await response.json();
        // Handle the new API response format: { success: true, data: { chats: [...] } }
        if (result.success && result.data && result.data.chats) {
          setChats(result.data.chats);
        } else {
          console.error('Unexpected API response format:', result);
          setChats([]);
        }
      } else {
        console.error('Failed to fetch chats:', response.status, response.statusText);
        setChats([]);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      setChats([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch chats from database on initial load
  React.useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Listen for title updates to refresh the chat list
  React.useEffect(() => {
    const handleTitleUpdate = () => {
      fetchChats();
    };

    window.addEventListener('chat-title-updated', handleTitleUpdate);

    return () => {
      window.removeEventListener('chat-title-updated', handleTitleUpdate);
    };
  }, [fetchChats]);

  const handleNewChat = () => {
    router.push(`/`);
  };

  const handleChatClick = (chat: ChatData) => {
    setActiveItem(`${chat._id}`);
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
      className="border-none bg-sidebar text-sidebar-foreground"
    >
      <SidebarHeader className="">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="logo" width={24} height={24} className="dark:invert" />
          </div>
          <SidebarTrigger className="text-sidebar-foreground/60 hover:text-sidebar-foreground" />
        </div>
      </SidebarHeader>

      <SidebarContent className="flex flex-col">
        <div className="flex-shrink-0">
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
                      className="w-full text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent focus:bg-sidebar-accent"
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
                      className="w-full text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent focus:bg-sidebar-accent"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
        
        <SidebarGroup className="group-data-[collapsible=icon]:hidden flex-grow flex flex-col">
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs font-medium px-2 py-1 flex-shrink-0">
            Chats
          </SidebarGroupLabel>
          <div className="overflow-y-auto h-full">
            <SidebarGroupContent>
              <SidebarMenu>
                {isLoading ? (
                  <SidebarMenuItem>
                    <div className="px-2 py-1 text-sm text-sidebar-foreground/60">
                      Loading chats...
                    </div>
                  </SidebarMenuItem>
                ) : chats.length === 0 ? (
                  <SidebarMenuItem>
                    <div className="px-2 py-1 text-sm text-sidebar-foreground/60">
                      No chats yet
                    </div>
                  </SidebarMenuItem>
                ) : (
                  chats.map((chat) => (
                    <SidebarMenuItem key={chat._id}>
                      <SidebarMenuButton
                        isActive={activeItem === `${chat._id}`}
                        onClick={() => handleChatClick(chat)}
                        className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent p-2 focus:bg-sidebar-accent"
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
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeItem === "Upgrade plan"}
              onClick={() => setActiveItem("Upgrade plan")}
              tooltip="Upgrade plan"
              className="w-full text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent focus:bg-sidebar-accent"
            >
              <Crown />
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">Upgrade plan</span>
           
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
