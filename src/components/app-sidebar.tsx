"use client"
import { useEffect, useState } from "react"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { LayoutDashboard, Users, Moon, Sun, LogOut } from "lucide-react"
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Students",  url: "/students",  icon: Users },
]

export function AppSidebar() {
  const { theme, setTheme } = useTheme()
  const { setOpenMobile } = useSidebar()
  const router = useRouter()
  const [profile, setProfile] = useState<{ fullName: string | null; role: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("staff_profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();
      if (data) setProfile({ fullName: data.full_name, role: data.role });
    });
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const roleLabel: Record<string, string> = {
    teacher: "Teacher",
    counselor: "Counselor",
    principal: "Principal",
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <span className="font-semibold px-2 py-1 text-base">EduDash</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton render={<Link href={item.url} onClick={() => setOpenMobile(false)} />}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-1">
        {profile && (
          <div className="px-2 py-1 flex items-center gap-2">
            <p className="text-xs text-muted-foreground truncate flex-1">
              {profile.fullName ?? "Staff Member"}
            </p>
            <Badge variant="secondary" className="text-xs shrink-0">
              {roleLabel[profile.role] ?? profile.role}
            </Badge>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span>Toggle theme</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
