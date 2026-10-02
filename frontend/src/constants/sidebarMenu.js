import {
  LayoutDashboard,
  Users,
  UserCheck,
  Megaphone,
  PhoneCall,
  GraduationCap,
  BookOpen,
  CreditCard,
  FileBarChart2,
  Settings,
  LogOut,
} from "lucide-react";

const sidebarMenu = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/admin/dashboard",
  },
  {
    title: "Lead Management",
    icon: Users,
    path: "/admin/leads",
  },
  {
    title: "Employees",
    icon: UserCheck,
    path: "/admin/employees",
  },
  {
    title: "Follow-ups",
    icon: PhoneCall,
    path: "/admin/followups",
  },
  {
    title: "Admissions",
    icon: GraduationCap,
    path: "/admin/admissions",
  },
  {
    title: "Students",
    icon: BookOpen,
    path: "/admin/students",
  },
  {
    title: "Fee Management",
    icon: CreditCard,
    path: "/admin/fees",
  },
  {
    title: "Reports",
    icon: FileBarChart2,
    path: "/admin/reports",
  },
  {
    title: "Settings",
    icon: Settings,
    path: "/admin/settings",
  },
  {
    title: "Logout",
    icon: LogOut,
    path: "/logout",
  },
];

export default sidebarMenu;