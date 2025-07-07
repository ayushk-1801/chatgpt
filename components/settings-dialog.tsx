"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Settings,
  User,
  Bell,
  Palette,
  Grid3x3,
  Shield,
  Database,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  children: React.ReactNode;
}

const settingsCategories = [
  { id: "general", label: "General", icon: Settings },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "personalization", label: "Personalization", icon: Palette },
  { id: "connected-apps", label: "Connected apps", icon: Grid3x3 },
  { id: "data-controls", label: "Data controls", icon: Database },
  { id: "security", label: "Security", icon: Shield },
  { id: "account", label: "Account", icon: User },
];

export function SettingsDialog({ children }: SettingsDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeCategory, setActiveCategory] = React.useState("general");
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = React.useState("auto-detect");
  const [voice, setVoice] = React.useState("maple");
  const [followUpSuggestions, setFollowUpSuggestions] = React.useState(true);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Theme</label>
        <Select value={theme} onValueChange={setTheme}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Select theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Language</label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto-detect">Auto-detect</SelectItem>
            <SelectItem value="english">English</SelectItem>
            <SelectItem value="spanish">Spanish</SelectItem>
            <SelectItem value="french">French</SelectItem>
            <SelectItem value="german">German</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Voice</label>
          <Button variant="ghost" size="sm" className="h-6 px-2">
            <Play className="w-3 h-3" />
            Play
          </Button>
        </div>
        <Select value={voice} onValueChange={setVoice}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="maple">Maple</SelectItem>
            <SelectItem value="sky">Sky</SelectItem>
            <SelectItem value="breeze">Breeze</SelectItem>
            <SelectItem value="cove">Cove</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Show follow up suggestions in chats</label>
        <Switch
          checked={followUpSuggestions}
          onCheckedChange={setFollowUpSuggestions}
        />
      </div>
    </div>
  );

  const renderNotificationsSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Desktop notifications</label>
          <p className="text-xs text-muted-foreground">Get notified about important updates</p>
        </div>
        <Switch defaultChecked={false} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Email notifications</label>
          <p className="text-xs text-muted-foreground">Receive updates via email</p>
        </div>
        <Switch defaultChecked={true} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Marketing emails</label>
          <p className="text-xs text-muted-foreground">Get tips and product updates</p>
        </div>
        <Switch defaultChecked={false} />
      </div>
    </div>
  );

  const renderPersonalizationSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Custom instructions</label>
          <p className="text-xs text-muted-foreground">Customize how ChatGPT responds to you</p>
        </div>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Memory</label>
          <p className="text-xs text-muted-foreground">ChatGPT will remember things you discuss</p>
        </div>
        <Switch defaultChecked={true} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Temporary chat</label>
          <p className="text-xs text-muted-foreground">Conversations won&apos;t be saved or used to train models</p>
        </div>
        <Switch defaultChecked={false} />
      </div>
    </div>
  );

  const renderConnectedAppsSettings = () => (
    <div className="space-y-6">
      <div className="text-center py-8">
        <Grid3x3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No connected apps</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Connect apps to enhance your ChatGPT experience
        </p>
        <Button variant="outline">Browse integrations</Button>
      </div>
    </div>
  );

  const renderDataControlsSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Chat history & training</label>
          <p className="text-xs text-muted-foreground">Save new conversations and use them to improve our models</p>
        </div>
        <Switch defaultChecked={true} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Improve the model for everyone</label>
          <p className="text-xs text-muted-foreground">Allow us to use your conversations to train our models</p>
        </div>
        <Switch defaultChecked={true} />
      </div>

      <div className="space-y-2">
        <Button variant="outline" className="w-full justify-start">
          Export data
        </Button>
        <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
          Delete account
        </Button>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Two-factor authentication</label>
          <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
        </div>
        <Button variant="outline" size="sm">
          Enable
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Active sessions</label>
          <p className="text-xs text-muted-foreground">Manage where you&apos;re signed in</p>
        </div>
        <Button variant="outline" size="sm">
          Manage
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Login alerts</label>
          <p className="text-xs text-muted-foreground">Get notified of new sign-ins</p>
        </div>
        <Switch defaultChecked={true} />
      </div>
    </div>
  );

  const renderAccountSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Email address</label>
          <p className="text-xs text-muted-foreground">user@example.com</p>
        </div>
        <Button variant="outline" size="sm">
          Change
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Password</label>
          <p className="text-xs text-muted-foreground">Last changed 30 days ago</p>
        </div>
        <Button variant="outline" size="sm">
          Change
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">Phone number</label>
          <p className="text-xs text-muted-foreground">Not set</p>
        </div>
        <Button variant="outline" size="sm">
          Add
        </Button>
      </div>
    </div>
  );

  const renderSettingsContent = () => {
    switch (activeCategory) {
      case "general":
        return renderGeneralSettings();
      case "notifications":
        return renderNotificationsSettings();
      case "personalization":
        return renderPersonalizationSettings();
      case "connected-apps":
        return renderConnectedAppsSettings();
      case "data-controls":
        return renderDataControlsSettings();
      case "security":
        return renderSecuritySettings();
      case "account":
        return renderAccountSettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="!max-w-6xl w-2xl h-[600px] p-0 bg-white dark:bg-[#303030] rounded-2xl">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-48 bg-gray-50 dark:bg-[#2a2a2a] p-1.5  rounded-l-xl">
            <div className="flex items-center justify-between mb-6 pt-2 pl-2">
              Settings
            </div>
            
            <nav className="space-y-1">
              {settingsCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-2 text-left text-sm rounded-lg transition-colors",
                      activeCategory === category.id
                        ? "bg-gray-200 dark:bg-[#404040] text-gray-900 dark:text-white"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#353535]"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{category.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1 p-6">
            <div className="w-full">
              <h3 className="text-lg font-semibold mb-6 capitalize">
                {settingsCategories.find(cat => cat.id === activeCategory)?.label}
              </h3>
              {renderSettingsContent()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
