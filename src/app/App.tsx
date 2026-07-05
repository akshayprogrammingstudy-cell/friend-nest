import { useState, useEffect, useRef, useCallback } from "react";
import { createClient, Session, RealtimeChannel } from "@supabase/supabase-js";
import { supabaseUrl, publicAnonKey, isSupabaseConfigured } from "../../utils/supabase/info";
import {
  Lock, Users, MessageCircle, CheckSquare, Award, Image as ImageIcon,
  BookOpen, User, LogOut, Send, Paperclip, Smile, Search,
  Plus, Star, Download, Share2, Trash2, Edit, Calendar,
  Bell, Moon, Sun, X, Check, Clock, Flag, Home, Settings,
  FileText, Film, Camera, Gift, ArrowRight, Pin, ChevronLeft,
  Eye, Filter, MoreVertical, Sparkles, Cake, ChevronRight
} from "lucide-react";

const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", publicAnonKey || "placeholder-key");
const env = (import.meta as any).env || {};

const MY_EMAIL = (env.VITE_MY_EMAIL || "akshaygowtam.m.l@gmail.com").trim().toLowerCase();
const AISHWARYA_EMAIL = (env.VITE_AISHWARYA_EMAIL || "AISHWARYA_EMAIL_HERE").trim().toLowerCase();
const AISHWARYA_NAME = (env.VITE_AISHWARYA_NAME || "Aishwarya").trim();
const STORAGE_BUCKET = "friendnest-files";
const ALLOWED_EMAILS = [MY_EMAIL, AISHWARYA_EMAIL].filter(email => email && !email.includes("_here"));

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isAishwaryaName(name: string) {
  return name.trim().toLowerCase() === AISHWARYA_NAME.toLowerCase();
}

function isAllowedEmail(email: string) {
  return ALLOWED_EMAILS.includes(normalizeEmail(email));
}

function isAishwaryaEmail(email?: string | null) {
  return Boolean(AISHWARYA_EMAIL && normalizeEmail(email || "") === AISHWARYA_EMAIL);
}

function personLabelFromEmail(email?: string | null, fallbackName?: string | null) {
  if (isAishwaryaEmail(email)) return AISHWARYA_NAME || "Aishwarya";
  if (normalizeEmail(email || "") === MY_EMAIL) return "Akshay";
  if (fallbackName && isAishwaryaName(fallbackName)) return AISHWARYA_NAME || "Aishwarya";
  return fallbackName || "Akshay";
}

function taskPersonLabel(value?: string | null, createdBy?: string | null) {
  const v = (value || "").toLowerCase();
  if (v === "both") return "Both";
  if (v === "aishwarya") return AISHWARYA_NAME || "Aishwarya";
  if (v === "akshay") return "Akshay";
  // Old data may contain assigned_to = "me". Show who created it instead of confusing both users.
  if (v === "me") return createdBy || "Creator";
  return value || "Not assigned";
}

function isOnlineStatusFresh(lastSeen?: string | null) {
  if (!lastSeen) return false;
  const last = new Date(lastSeen).getTime();
  if (Number.isNaN(last)) return false;
  // Treat user as online only if the account sent a heartbeat recently.
  return Date.now() - last < 75_000;
}

type Page =
  | "login"
  | "birthday-surprise"
  | "birthday-card"
  | "dashboard"
  | "chat"
  | "tasks"
  | "certificates"
  | "media"
  | "memories"
  | "profile";

interface AppUser {
  id: string;
  email: string;
  name: string;
}

interface Message {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  type: "text";
  created_at: string;
  pinned?: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: "akshay" | "aishwarya" | "both" | "me";
  created_by: string;
  created_by_email?: string | null;
  due_date: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
  completed_by?: string | null;
  completed_by_email?: string | null;
  completed_at?: string | null;
  updated_at?: string | null;
  created_at: string;
}

interface Certificate {
  id: string;
  title: string;
  course_name: string;
  issuing_org: string;
  completion_date: string;
  tags: string[];
  user_name: string;
  user_email?: string | null;
  file_url?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_mime?: string | null;
  file_size?: number | null;
  created_at: string;
}

type NewCertificate = Omit<Certificate, "id" | "created_at"> & { _file?: File | null };

interface MediaItem {
  id: string;
  name: string;
  type: "photo" | "video" | "document";
  user_name: string;
  user_email?: string | null;
  file_url?: string | null;
  file_path?: string | null;
  file_mime?: string | null;
  file_size?: number | null;
  created_at: string;
}

type NewMediaItem = Omit<MediaItem, "id" | "created_at"> & { _file?: File | null };

interface Memory {
  id: string;
  title: string;
  note: string;
  date: string;
  is_favorite: boolean;
  created_by: string;
  user_email?: string | null;
  image_url?: string | null;
  file_url?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_mime?: string | null;
  file_size?: number | null;
  created_at: string;
}

type NewMemory = Omit<Memory, "id" | "created_at"> & { _file?: File | null };

interface UserStatus {
  email: string;
  user_id?: string | null;
  name?: string | null;
  is_online: boolean;
  last_seen: string;
  updated_at?: string | null;
}

function isBelatedBirthdayActive() {
  const now = new Date();
  // Belated surprise should auto-open only today: July 5, 2026.
  // After July 5, 2026 at 11:59 PM, it automatically stops showing.
  const start = new Date(2026, 6, 5, 0, 0, 0, 0);
  const end = new Date(2026, 6, 5, 23, 59, 59, 999);
  return now >= start && now <= end;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function cn(...classes: Array<string | false | undefined | null | Record<string, boolean>>) {
  return classes
    .flatMap(item => {
      if (!item) return [];
      if (typeof item === "string") return [item];
      return Object.entries(item).filter(([, active]) => active).map(([className]) => className);
    })
    .join(" ");
}

/* ─── UI Primitives ─────────────────────────────────────────────────── */

function Btn({
  children, onClick, variant = "primary", size = "md", className = "", disabled = false, type = "button"
}: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "soft" | "danger";
  size?: "sm" | "md" | "lg"; className?: string; disabled?: boolean; type?: "button" | "submit";
}) {
  const base = "inline-flex items-center gap-2 rounded-xl font-semibold transition-all duration-200 cursor-pointer select-none";
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3 text-base" };
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-violet-700 shadow-md hover:shadow-lg active:scale-95",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
    soft: "bg-secondary text-foreground hover:bg-violet-100 active:scale-95",
    danger: "bg-destructive/10 text-destructive hover:bg-destructive hover:text-white",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(base, sizes[size], variants[variant], disabled && "opacity-50 pointer-events-none", className)}
    >
      {children}
    </button>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-card rounded-2xl shadow-sm border border-border p-5", className)}>
      {children}
    </div>
  );
}

function Input({
  label, type = "text", value, onChange, placeholder = "", icon
}: {
  label?: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-semibold text-foreground">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-xl bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all",
            icon && "pl-10"
          )}
        />
      </div>
    </div>
  );
}

function Badge({ label, color = "purple" }: { label: string; color?: "purple" | "pink" | "blue" | "green" | "red" | "yellow" }) {
  const colors = {
    purple: "bg-violet-100 text-violet-700",
    pink: "bg-pink-100 text-pink-700",
    blue: "bg-sky-100 text-sky-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-rose-100 text-rose-700",
    yellow: "bg-amber-100 text-amber-700",
  };
  return <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold", colors[color])}>{label}</span>;
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground max-w-xs">{desc}</p>
    </div>
  );
}

/* ─── Confetti / Birthday Animation ─────────────────────────────────── */

function Confetti() {
  const colors = ["#8b5cf6", "#f9a8d4", "#7dd3fc", "#fde68a", "#a7f3d0", "#fb923c"];
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    duration: `${3 + Math.random() * 4}s`,
    size: `${6 + Math.random() * 8}px`,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {pieces.map(p => (
        <div
          key={p.id}
          className="absolute top-0 rounded-sm opacity-90"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `fall ${p.duration} ${p.delay} linear infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes pulse-celebration {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.3); opacity: 1; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0.3) translateY(40px); opacity: 0; }
          60% { transform: scale(1.05) translateY(-5px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}

/* ─── Sidebar Navigation ─────────────────────────────────────────────── */

function Sidebar({ page, onNav, user, onLogout }: {
  page: Page; onNav: (p: Page) => void; user: AppUser; onLogout: () => void;
}) {
  const navItems: { icon: React.ReactNode; label: string; page: Page }[] = [
    { icon: <Home size={18} />, label: "Dashboard", page: "dashboard" },
    { icon: <MessageCircle size={18} />, label: "Chat", page: "chat" },
    { icon: <CheckSquare size={18} />, label: "Tasks", page: "tasks" },
    { icon: <Award size={18} />, label: "Certificates", page: "certificates" },
    { icon: <ImageIcon size={18} />, label: "Media", page: "media" },
    { icon: <BookOpen size={18} />, label: "Memories", page: "memories" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-card border-r border-border p-5 gap-6 fixed left-0 top-0 z-20">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 pt-1">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-pink-400 flex items-center justify-center shadow-md">
          <Users size={16} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-foreground text-sm leading-none" style={{ fontFamily: "Lora, serif" }}>FriendNest</p>
          <p className="text-xs text-muted-foreground">Private space</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(item => (
          <button
            key={item.page}
            onClick={() => onNav(item.page)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left w-full",
              page === item.page
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}

        {isAishwaryaName(user.name) && isBelatedBirthdayActive() && (
          <button
            onClick={() => onNav("birthday-surprise")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left w-full bg-gradient-to-r from-pink-100 to-violet-100 text-pink-700 hover:from-pink-200 hover:to-violet-200"
          >
            <Cake size={18} />
            Belated Birthday
          </button>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-border pt-4 flex flex-col gap-2">
        <button
          onClick={() => onNav("profile")}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left",
            page === "profile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
            {user.name[0]}
          </div>
          <span className="flex-1 truncate">{user.name}</span>
          <Settings size={14} />
        </button>
        <button onClick={onLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full text-left">
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function BottomNav({ page, onNav }: { page: Page; onNav: (p: Page) => void }) {
  const items = [
    { icon: <Home size={20} />, page: "dashboard" as Page, label: "Home" },
    { icon: <MessageCircle size={20} />, page: "chat" as Page, label: "Chat" },
    { icon: <CheckSquare size={20} />, page: "tasks" as Page, label: "Tasks" },
    { icon: <BookOpen size={20} />, page: "memories" as Page, label: "Memories" },
    { icon: <User size={20} />, page: "profile" as Page, label: "Profile" },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex z-20 safe-area-pb">
      {items.map(item => (
        <button
          key={item.page}
          onClick={() => onNav(item.page)}
          className={cn(
            "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-all",
            page === item.page ? "text-primary" : "text-muted-foreground"
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  );
}

/* ─── Login Page ─────────────────────────────────────────────────────── */

function LoginPage({ onLogin, error, loading }: {
  onLogin: (email: string, password: string, name: string) => void;
  error: string; loading: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-pink-50 to-sky-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-pink-400 flex items-center justify-center shadow-xl mx-auto mb-4" style={{ animation: "float 4s ease-in-out infinite" }}>
            <Users size={36} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-1" style={{ fontFamily: "Lora, serif" }}>FriendNest</h1>
          <p className="text-muted-foreground text-sm">Our private space for chats, tasks, memories & achievements</p>
        </div>

        {/* Card */}
        <Card className="shadow-xl">
          <div className="flex items-center gap-2 mb-5 text-muted-foreground">
            <Lock size={14} />
            <span className="text-xs font-semibold uppercase tracking-wider">Private space only for us</span>
          </div>

          <div className="flex flex-col gap-4">
            <Input label="Your Name" value={name} onChange={setName} placeholder="Enter your name" icon={<User size={15} />} />
            <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="Enter your email" icon={<Lock size={15} />} />
            <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="Enter your password" />

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 font-medium">
                {error}
              </div>
            )}

            <Btn
              onClick={() => onLogin(email, password, name)}
              size="lg"
              className="w-full justify-center mt-1"
              disabled={loading}
            >
              {loading ? "Signing in…" : <>
                <Lock size={16} /> Sign In to FriendNest
              </>}
            </Btn>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          This website is exclusively for two people. All data is private and secure.
        </p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

/* ─── Birthday Surprise Page ─────────────────────────────────────────── */

function BirthdaySurprisePage({ onOpenSurprise, onDashboard }: {
  onOpenSurprise: () => void; onDashboard: () => void;
}) {
  const sparkles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${5 + (i * 5.5) % 92}%`,
    size: `${16 + (i * 7) % 20}px`,
    delay: `${(i * 0.4) % 3}s`,
    duration: `${4 + (i * 0.5) % 4}s`,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-400 via-pink-400 to-rose-400 flex items-center justify-center relative overflow-hidden">
      <Confetti />

      {/* Floating celebration sparkles */}
      {sparkles.map(h => (
        <div
          key={h.id}
          className="absolute text-white/50"
          style={{
            left: h.left,
            bottom: "-20px",
            fontSize: h.size,
            animation: `floatUp ${h.duration} ${h.delay} ease-in-out infinite`,
          }}
        >
          ✨
        </div>
      ))}

      <div className="relative z-20 text-center text-white px-6 max-w-lg">
        {/* Cake */}
        <div className="text-8xl mb-4" style={{ animation: "bounce-in 1s ease-out forwards, float 4s 1s ease-in-out infinite" }}>
          🎂
        </div>

        <div className="mb-2 text-6xl" style={{ animation: "bounce-in 1.2s ease-out forwards" }}>🎉</div>

        <h1
          className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg"
          style={{ fontFamily: "Lora, serif", animation: "bounce-in 1.4s ease-out forwards" }}
        >
          Belated Happy Birthday
          <br />
          <span className="text-yellow-200">Aishwarya!</span>
        </h1>

        <p className="text-base md:text-lg text-white/90 mb-8 leading-relaxed drop-shadow" style={{ animation: "bounce-in 1.6s ease-out forwards" }}>
          "Belated Happy Birthday Aishwarya! I may be a little late, but my wishes are full of care and happiness for you. I hope this year brings you success, peace, beautiful memories, and everything you truly deserve. Thank you for being such a good friend in my life."
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center" style={{ animation: "bounce-in 1.8s ease-out forwards" }}>
          <button
            onClick={onOpenSurprise}
            className="px-8 py-3.5 rounded-2xl bg-white text-violet-700 font-bold text-base hover:bg-yellow-50 transition-all shadow-xl hover:shadow-2xl active:scale-95 flex items-center gap-2 justify-center"
          >
            <Gift size={18} /> Open My Surprise
          </button>
          <button
            onClick={onDashboard}
            className="px-8 py-3.5 rounded-2xl bg-white/20 backdrop-blur-sm text-white font-semibold text-base hover:bg-white/30 transition-all border border-white/30 active:scale-95 flex items-center gap-2 justify-center"
          >
            Go to Dashboard <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 0.5; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-110vh) scale(0.5); opacity: 0; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0.5) translateY(30px); opacity: 0; }
          70% { transform: scale(1.05) translateY(-3px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}

/* ─── Birthday Card Page ─────────────────────────────────────────────── */

function BirthdayCardPage({ onSaveMemory, onDashboard }: {
  onSaveMemory: () => void; onDashboard: () => void;
}) {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    onSaveMemory();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-violet-100 to-sky-100 flex items-center justify-center p-4">
      <Confetti />
      <div className="relative z-10 w-full max-w-lg">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-pink-100">
          {/* Card header */}
          <div className="bg-gradient-to-r from-violet-500 to-pink-500 p-8 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              {Array.from({ length: 20 }, (_, i) => (
                <span key={i} className="absolute text-2xl" style={{ left: `${(i * 5) % 100}%`, top: `${(i * 7) % 100}%` }}>✦</span>
              ))}
            </div>
            <div className="relative z-10">
              <div className="text-6xl mb-3">🎁</div>
              <h2 className="text-3xl font-bold" style={{ fontFamily: "Lora, serif" }}>Belated Happy Birthday!</h2>
              <p className="text-white/80 text-sm mt-1">A special message just for you</p>
            </div>
          </div>

          {/* Message */}
          <div className="p-8">
            <div className="flex gap-2 mb-4">
              {["🌸", "✨", "🎊", "🌟"].map(e => (
                <span key={e} className="text-2xl" style={{ animation: "pulse-celebration 2s ease-in-out infinite" }}>{e}</span>
              ))}
            </div>
            <p className="text-foreground leading-relaxed text-base font-medium" style={{ fontFamily: "Lora, serif" }}>
              "Belated Happy Birthday Aishwarya! You are truly special, and I hope this message still brings a big smile to your face. May this year be filled with success, happiness, peace, and beautiful memories. Thank you for being an amazing friend in my life."
            </p>

          </div>

          {/* Actions */}
          <div className="px-8 pb-8 flex flex-col sm:flex-row gap-3">
            <Btn onClick={handleSave} variant={saved ? "ghost" : "primary"} className="flex-1 justify-center" disabled={saved}>
              {saved ? <><Check size={16} /> Saved to Memories!</> : <><BookOpen size={16} /> Save this Memory</>}
            </Btn>
            <Btn onClick={onDashboard} variant="soft" className="flex-1 justify-center">
              Go to Dashboard <ArrowRight size={16} />
            </Btn>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-celebration {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

/* ─── Dashboard ──────────────────────────────────────────────────────── */

function DashboardPage({ user, onNav, tasks, unreadMessages }: {
  user: AppUser; onNav: (p: Page) => void;
  tasks: Task[]; unreadMessages: Message[];
}) {
  const pendingTaskList = tasks.filter(t => t.status !== "completed");
  const pendingTasks = pendingTaskList.length;
  const latestUnreadMessage = unreadMessages[unreadMessages.length - 1];
  const today = new Date().toISOString().split("T")[0];
  const dueToday = pendingTaskList.filter(t => t.due_date === today).length;
  const importantTasks = pendingTaskList.filter(t => t.priority === "high").length;

  const quickActions = [
    { icon: <MessageCircle size={20} />, label: "Chat", page: "chat" as Page, color: "bg-violet-100 text-violet-700" },
    { icon: <CheckSquare size={20} />, label: "Tasks", page: "tasks" as Page, color: "bg-pink-100 text-pink-700" },
    { icon: <Award size={20} />, label: "Certs", page: "certificates" as Page, color: "bg-sky-100 text-sky-700" },
    { icon: <ImageIcon size={20} />, label: "Media", page: "media" as Page, color: "bg-emerald-100 text-emerald-700" },
    { icon: <BookOpen size={20} />, label: "Memories", page: "memories" as Page, color: "bg-amber-100 text-amber-700" },
  ];

  return (
    <div className="p-5 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Welcome back,</p>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Lora, serif" }}>
            {user.name} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        {isAishwaryaName(user.name) && isBelatedBirthdayActive() && (
          <button onClick={() => onNav("birthday-surprise")} className="bg-gradient-to-r from-pink-400 to-violet-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2">
            <Cake size={16} /> Belated! 🎂
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Unread Messages", value: unreadMessages.length, icon: <MessageCircle size={18} />, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Pending Tasks", value: pendingTasks, icon: <CheckSquare size={18} />, color: "text-pink-600", bg: "bg-pink-50" },
          { label: "Due Today", value: dueToday, icon: <Calendar size={18} />, color: "text-sky-600", bg: "bg-sky-50" },
          { label: "Important", value: importantTasks, icon: <Flag size={18} />, color: "text-rose-600", bg: "bg-rose-50" },
        ].map(stat => (
          <Card key={stat.label} className="flex flex-col gap-2">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Quick Access</p>
        <div className="grid grid-cols-5 gap-3">
          {quickActions.map(a => (
            <button key={a.page} onClick={() => onNav(a.page)} className={cn("flex flex-col items-center gap-2 p-3 rounded-2xl transition-all hover:scale-105 active:scale-95", a.color, "bg-opacity-60")}>
              {a.icon}
              <span className="text-xs font-semibold">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Unread message */}
      {latestUnreadMessage && (
        <Card className="border-violet-200 bg-violet-50/40">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">New Unread Message</p>
            <button onClick={() => onNav("chat")} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              Open Chat <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {latestUnreadMessage.user_name[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{latestUnreadMessage.user_name}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">{latestUnreadMessage.content}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatTime(latestUnreadMessage.created_at)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Pending tasks */}
      {tasks.filter(t => t.status !== "completed").length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">Pending Tasks</p>
            <button onClick={() => onNav("tasks")} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              View All <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {tasks.filter(t => t.status !== "completed").slice(0, 3).map(task => (
              <div key={task.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", {
                  "bg-rose-400": task.priority === "high",
                  "bg-amber-400": task.priority === "medium",
                  "bg-emerald-400": task.priority === "low",
                })} />
                <span className="text-sm text-foreground flex-1 truncate">{task.title}</span>
                {task.due_date && <span className="text-xs text-muted-foreground">{formatDate(task.due_date)}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {pendingTasks === 0 && unreadMessages.length === 0 && (
        <Card className="text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <Check size={22} />
          </div>
          <p className="font-semibold text-foreground">All caught up</p>
          <p className="text-sm text-muted-foreground mt-1">No unread messages and no pending tasks right now.</p>
        </Card>
      )}
    </div>
  );
}

/* ─── Chat Page ──────────────────────────────────────────────────────── */

function ChatPage({ user, messages, onSend, friendOnline, friendName, friendLastSeen, onMarkRead }: {
  user: AppUser; messages: Message[]; onSend: (content: string) => Promise<void> | void;
  friendOnline: boolean; friendName: string; friendLastSeen?: string | null; onMarkRead: () => void;
}) {
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    onMarkRead();
    // Mark as read only when chat messages change while this page is open.
  }, [messages.length]);

  const filtered = search ? messages.filter(m => m.content.toLowerCase().includes(search.toLowerCase())) : messages;

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const messageText = text.trim();
    setSending(true);
    setSendError("");
    try {
      await onSend(messageText);
      setText("");
    } catch (error: any) {
      setSendError(error?.message || "Message could not be sent. Please check Supabase SQL policies.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] md:h-screen">
      {/* Header */}
      <div className="bg-card border-b border-border px-5 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white font-bold">
            {friendName[0] || "F"}
          </div>
          <div className={cn("absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card", friendOnline ? "bg-emerald-400" : "bg-slate-300")} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm text-foreground">
            {friendName}
          </p>
          <p className={cn("text-xs font-medium", friendOnline ? "text-emerald-500" : "text-muted-foreground")}>
            {friendOnline ? "Online" : friendLastSeen ? `Offline · last seen ${formatTime(friendLastSeen)}` : "Offline"}
          </p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-8 pr-3 py-1.5 rounded-xl bg-muted text-xs border-none focus:outline-none focus:ring-1 focus:ring-ring w-32"
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24 md:pb-4" style={{ scrollbarWidth: "none" }}>
        {filtered.length === 0 && (
          <EmptyState icon={<MessageCircle size={24} />} title="No messages yet" desc="Start a conversation with your friend!" />
        )}
        {filtered.map(msg => {
          const isMe = msg.user_id === user.id;
          return (
            <div key={msg.id} className={cn("flex gap-2.5", isMe ? "flex-row-reverse" : "flex-row")}>
              {!isMe && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1">
                  {msg.user_name[0]}
                </div>
              )}
              <div className={cn("max-w-[72%] flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                    isMe
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card text-foreground border border-border rounded-tl-sm"
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-xs text-muted-foreground px-1">{formatTime(msg.created_at)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-card border-t border-border px-4 py-3 flex items-center gap-3 flex-shrink-0 mb-16 md:mb-0">
        <button className="text-muted-foreground hover:text-primary transition-all"><Smile size={20} /></button>
        <button className="text-muted-foreground hover:text-primary transition-all"><Paperclip size={20} /></button>
        <div className="flex-1">
          {sendError && <p className="text-xs font-semibold text-rose-600 mb-1">{sendError}</p>}
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type a message…"
            className="w-full bg-input-background rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-violet-700 transition-all disabled:opacity-40 active:scale-90"
        >
          {sending ? <Clock size={16} /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}

/* ─── Tasks Page ─────────────────────────────────────────────────────── */

const defaultTask: Omit<Task, "id" | "created_at"> = {
  title: "", description: "", assigned_to: "both", created_by: "", created_by_email: "",
  due_date: "", priority: "medium", status: "pending",
  completed_by: null, completed_by_email: null, completed_at: null, updated_at: null,
};

function TasksPage({ user, tasks, onAdd, onToggle, onDelete }: {
  user: AppUser; tasks: Task[];
  onAdd: (t: Omit<Task, "id" | "created_at">) => Promise<void> | void;
  onToggle: (id: string) => Promise<void> | void;
  onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...defaultTask, created_by: user.name, created_by_email: user.email });
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const filtered = tasks.filter(t => filter === "all" ? true : filter === "pending" ? t.status !== "completed" : t.status === "completed");
  const priorityColor: Record<Task["priority"], "red" | "yellow" | "green"> = { high: "red", medium: "yellow", low: "green" };

  const handleAdd = async () => {
    if (!form.title.trim()) {
      setFormError("Please enter the task title.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await onAdd({ ...form, created_by: user.name, created_by_email: user.email });
      setForm({ ...defaultTask, created_by: user.name, created_by_email: user.email });
      setShowForm(false);
    } catch (error: any) {
      setFormError(error?.message || "Task could not be saved. Please check Supabase permissions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 md:p-8 space-y-5 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "Lora, serif" }}>Tasks</h2>
          <p className="text-sm text-muted-foreground">{tasks.filter(t => t.status !== "completed").length} pending</p>
        </div>
        <Btn onClick={() => setShowForm(true)} size="sm"><Plus size={14} /> New Task</Btn>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "pending", "completed"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary")}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="border-primary/30">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-foreground">New Task</p>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
          </div>
          <div className="grid gap-3">
            <Input label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="What needs to be done?" />
            <Input label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Details…" />
            <Input label="Due Date" type="date" value={form.due_date} onChange={v => setForm(f => ({ ...f, due_date: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">Assign To</label>
                <select
                  value={form.assigned_to}
                  onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value as Task["assigned_to"] }))}
                  className="w-full rounded-xl bg-input-background border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="akshay">Akshay</option>
                  <option value="aishwarya">Aishwarya</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground block mb-1.5">Priority</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value as Task["priority"] }))}
                  className="w-full rounded-xl bg-input-background border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            {formError && <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">{formError}</div>}
            <div className="flex gap-2 pt-1">
              <Btn onClick={handleAdd} size="sm" className="flex-1 justify-center" disabled={saving}><Check size={14} /> {saving ? "Saving…" : "Add Task"}</Btn>
              <Btn onClick={() => setShowForm(false)} variant="ghost" size="sm" disabled={saving}>Cancel</Btn>
            </div>
          </div>
        </Card>
      )}

      {/* Task list */}
      {filtered.length === 0 ? (
        <EmptyState icon={<CheckSquare size={24} />} title="No tasks here" desc="Create a task to get started!" />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(task => (
            <Card key={task.id} className={cn("transition-all", task.status === "completed" && "opacity-60")}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => onToggle(task.id)}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                    task.status === "completed" ? "bg-emerald-500 border-emerald-500" : "border-border hover:border-primary"
                  )}
                >
                  {task.status === "completed" && <Check size={10} className="text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className={cn("font-semibold text-sm text-foreground", task.status === "completed" && "line-through text-muted-foreground")}>
                      {task.title}
                    </p>
                    <Badge label={task.priority} color={priorityColor[task.priority]} />
                  </div>
                  {task.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {task.due_date && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar size={11} /> {formatDate(task.due_date)}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User size={11} /> Assigned to {taskPersonLabel(task.assigned_to, task.created_by)}
                    </span>
                    <Badge
                      label={task.status.replace("_", " ")}
                      color={task.status === "completed" ? "green" : task.status === "in_progress" ? "blue" : "purple"}
                    />
                    {task.status === "completed" ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <Check size={11} /> Completed by {personLabelFromEmail(task.completed_by_email, task.completed_by || "Someone")}{task.completed_at ? ` · ${formatDate(task.completed_at)}` : ""}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                        <Clock size={11} /> Not completed yet · waiting for {taskPersonLabel(task.assigned_to, task.created_by)}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => onDelete(task.id)} className="text-muted-foreground hover:text-destructive transition-all flex-shrink-0 mt-0.5">
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Certificates Page ──────────────────────────────────────────────── */

function CertificatesPage({ user, certificates, onAdd, onDelete }: {
  user: AppUser; certificates: Certificate[];
  onAdd: (c: NewCertificate) => Promise<void> | void;
  onDelete: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", course_name: "", issuing_org: "", completion_date: "", tags: [] as string[], user_name: user.name, user_email: user.email });
  const [file, setFile] = useState<File | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "mine" | "aishwarya">("all");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const filtered = certificates.filter(c => {
    const ownerEmail = normalizeEmail(c.user_email || "");
    const ownerName = personLabelFromEmail(ownerEmail, c.user_name);
    const isMine = ownerEmail ? ownerEmail === user.email : c.user_name === user.name;
    const isAishwaryaOwner = ownerEmail ? ownerEmail === AISHWARYA_EMAIL : isAishwaryaName(c.user_name);
    const matchesSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.course_name.toLowerCase().includes(search.toLowerCase()) || ownerName.toLowerCase().includes(search.toLowerCase());
    const matchesOwner = ownerFilter === "all" || (ownerFilter === "mine" ? isMine : isAishwaryaOwner);
    return matchesSearch && matchesOwner;
  });

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(f => ({ ...f, tags: [...f.tags, tagInput.trim()] }));
      setTagInput("");
    }
  };

  const handleAdd = async () => {
    if (!form.title.trim()) {
      setFormError("Please enter the certificate title.");
      return;
    }
    setSaving(true);
    setFormError("");
    setFormSuccess("");
    try {
      await onAdd({ ...form, user_name: user.name, user_email: user.email, _file: file });
      setForm({ title: "", course_name: "", issuing_org: "", completion_date: "", tags: [], user_name: user.name, user_email: user.email });
      setFile(null);
      setFormSuccess("Certificate saved successfully.");
      setTimeout(() => { setShowForm(false); setFormSuccess(""); }, 800);
    } catch (error: any) {
      setFormError(error?.message || "Certificate could not be saved. Check Supabase tables and storage bucket.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 md:p-8 space-y-5 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "Lora, serif" }}>Certificates</h2>
          <p className="text-sm text-muted-foreground">{certificates.length} stored</p>
        </div>
        <Btn onClick={() => setShowForm(true)} size="sm"><Plus size={14} /> Add Certificate</Btn>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search certificates…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-input-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {([
            ["all", "All Certificates"],
            ["mine", "My Certificates"],
            ["aishwarya", "Aishwarya's Certificates"],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setOwnerFilter(key)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all", ownerFilter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary")}> {label}</button>
          ))}
        </div>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold">Add Certificate</p>
            <button onClick={() => setShowForm(false)}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <div className="grid gap-3">
            <Input label="Certificate Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. React Advanced Course" />
            <Input label="Course Name" value={form.course_name} onChange={v => setForm(f => ({ ...f, course_name: v }))} placeholder="e.g. The Complete React Guide" />
            <Input label="Issuing Organization" value={form.issuing_org} onChange={v => setForm(f => ({ ...f, issuing_org: v }))} placeholder="e.g. Udemy, Coursera…" />
            <Input label="Completion Date" type="date" value={form.completion_date} onChange={v => setForm(f => ({ ...f, completion_date: v }))} />
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Upload Certificate File</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl bg-input-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {file && <p className="text-xs text-muted-foreground mt-1">Selected: {file.name}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Tags</label>
              <div className="flex gap-2">
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()}
                  placeholder="Add tag…" className="flex-1 rounded-xl bg-input-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <Btn onClick={addTag} size="sm" variant="soft">Add</Btn>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
                      {tag}
                      <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))}><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {formError && <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">{formError}</div>}
            {formSuccess && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">{formSuccess}</div>}
            <div className="flex gap-2 pt-1">
              <Btn onClick={handleAdd} size="sm" className="flex-1 justify-center" disabled={saving}><Check size={14} /> {saving ? "Saving…" : "Save"}</Btn>
              <Btn onClick={() => setShowForm(false)} variant="ghost" size="sm" disabled={saving}>Cancel</Btn>
            </div>
          </div>
        </Card>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={<Award size={24} />} title="No certificates yet" desc="Add your course certificates to keep them safe!" />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(cert => (
            <Card key={cert.id} className="group hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                  <Award size={22} className="text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{cert.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{cert.course_name}</p>
                  <p className="text-xs text-muted-foreground">{cert.issuing_org}</p>
                  {cert.completion_date && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Calendar size={10} /> {formatDate(cert.completion_date)}
                    </p>
                  )}
                  {cert.file_name && <p className="text-xs text-violet-600 mt-1 truncate">File: {cert.file_name}</p>}
                  {cert.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {cert.tags.map(tag => <Badge key={tag} label={tag} color="purple" />)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-border opacity-0 group-hover:opacity-100 transition-all">
                <Badge label={personLabelFromEmail(cert.user_email, cert.user_name)} color="blue" />
                <div className="flex-1" />
                {cert.file_url && (
                  <a href={cert.file_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-all"><Eye size={14} /></a>
                )}
                {cert.file_url && (
                  <a href={cert.file_url} download={cert.file_name || cert.title} className="text-muted-foreground hover:text-primary transition-all"><Download size={14} /></a>
                )}
                <button onClick={() => cert.file_url && navigator.clipboard?.writeText(cert.file_url)} className="text-muted-foreground hover:text-primary transition-all"><Share2 size={14} /></button>
                <button onClick={() => onDelete(cert.id)} className="text-muted-foreground hover:text-destructive transition-all"><Trash2 size={14} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Media Page ─────────────────────────────────────────────────────── */

function MediaPage({ user, media, onAdd, onDelete }: {
  user: AppUser; media: MediaItem[];
  onAdd: (m: NewMediaItem) => Promise<void> | void;
  onDelete: (id: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "photo" | "video" | "document">("all");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "mine" | "aishwarya">("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "photo" as MediaItem["type"], user_name: user.name, user_email: user.email });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const filtered = media.filter(m => {
    const ownerEmail = normalizeEmail(m.user_email || "");
    const isMine = ownerEmail ? ownerEmail === user.email : m.user_name === user.name;
    const isAishwaryaOwner = ownerEmail ? ownerEmail === AISHWARYA_EMAIL : isAishwaryaName(m.user_name);
    const matchesType = filter === "all" || m.type === filter;
    const matchesOwner = ownerFilter === "all" || (ownerFilter === "mine" ? isMine : isAishwaryaOwner);
    return matchesType && matchesOwner;
  });

  const typeIcon = (type: MediaItem["type"]) => {
    if (type === "photo") return <Camera size={20} className="text-pink-500" />;
    if (type === "video") return <Film size={20} className="text-violet-500" />;
    return <FileText size={20} className="text-sky-500" />;
  };

  const typeBg = (type: MediaItem["type"]) => {
    if (type === "photo") return "from-pink-100 to-rose-100";
    if (type === "video") return "from-violet-100 to-indigo-100";
    return "from-sky-100 to-blue-100";
  };

  const handleAdd = async () => {
    if (!form.name.trim() && !file) {
      setFormError("Please choose a file or enter a file name.");
      return;
    }
    setSaving(true);
    setFormError("");
    setFormSuccess("");
    try {
      await onAdd({ ...form, name: form.name.trim() || file?.name || "Shared file", user_name: user.name, user_email: user.email, _file: file });
      setForm({ name: "", type: "photo", user_name: user.name, user_email: user.email });
      setFile(null);
      setFormSuccess("File saved successfully.");
      setTimeout(() => { setShowForm(false); setFormSuccess(""); }, 800);
    } catch (error: any) {
      setFormError(error?.message || "File could not be saved. Check Supabase storage permissions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 md:p-8 space-y-5 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "Lora, serif" }}>Shared Media</h2>
          <p className="text-sm text-muted-foreground">{media.length} files</p>
        </div>
        <Btn onClick={() => setShowForm(true)} size="sm"><Plus size={14} /> Add File</Btn>
      </div>

      {/* Type and owner filters */}
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          {(["all", "photo", "video", "document"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all flex items-center gap-1.5",
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary")}>
              {f === "photo" && <Camera size={12} />}
              {f === "video" && <Film size={12} />}
              {f === "document" && <FileText size={12} />}
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {([
            ["all", "All Files"],
            ["mine", "My Files"],
            ["aishwarya", "Aishwarya's Files"],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setOwnerFilter(key)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all", ownerFilter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary")}> {label}</button>
          ))}
        </div>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold">Add File</p>
            <button onClick={() => setShowForm(false)}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <div className="grid gap-3">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Upload File</label>
              <input
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                onChange={e => {
                  const selected = e.target.files?.[0] || null;
                  setFile(selected);
                  if (selected) {
                    const inferredType: MediaItem["type"] = selected.type.startsWith("image/") ? "photo" : selected.type.startsWith("video/") ? "video" : "document";
                    setForm(f => ({ ...f, name: f.name || selected.name, type: inferredType }));
                  }
                }}
                className="w-full rounded-xl bg-input-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {file && <p className="text-xs text-muted-foreground mt-1">Selected: {file.name}</p>}
            </div>
            <Input label="File Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Our trip photo.jpg" />
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as MediaItem["type"] }))}
                className="w-full rounded-xl bg-input-background border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="photo">Photo</option>
                <option value="video">Video</option>
                <option value="document">Document</option>
              </select>
            </div>
            {formError && <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">{formError}</div>}
            {formSuccess && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">{formSuccess}</div>}
            <div className="flex gap-2 pt-1">
              <Btn onClick={handleAdd} size="sm" className="flex-1 justify-center" disabled={saving}><Check size={14} /> {saving ? "Saving…" : "Save"}</Btn>
              <Btn onClick={() => setShowForm(false)} variant="ghost" size="sm" disabled={saving}>Cancel</Btn>
            </div>
          </div>
        </Card>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={<ImageIcon size={24} />} title="No files yet" desc="Upload photos, videos, and documents to share!" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map(item => (
            <div key={item.id} className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all">
              <div className={cn("h-28 bg-gradient-to-br flex items-center justify-center", typeBg(item.type))}>
                {typeIcon(item.type)}
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">{personLabelFromEmail(item.user_email, item.user_name)} · {formatDate(item.created_at)}</p>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all flex gap-1">
                {item.file_url && (
                  <a href={item.file_url} target="_blank" rel="noreferrer" className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center hover:bg-white shadow-sm">
                    <Eye size={12} className="text-foreground" />
                  </a>
                )}
                {item.file_url && (
                  <a href={item.file_url} download={item.name} className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center hover:bg-white shadow-sm">
                    <Download size={12} className="text-foreground" />
                  </a>
                )}
                <button onClick={() => onDelete(item.id)} className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center hover:bg-white shadow-sm">
                  <Trash2 size={12} className="text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Memories Page ──────────────────────────────────────────────────── */

function MemoriesPage({ user, memories, onAdd, onDelete, onToggleFavorite }: {
  user: AppUser; memories: Memory[];
  onAdd: (m: NewMemory) => Promise<void> | void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", note: "", date: new Date().toISOString().split("T")[0], is_favorite: false, created_by: user.name, user_email: user.email });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const handleAdd = async () => {
    if (!form.title.trim() && !form.note.trim() && !file) {
      setFormError("Add a title, note, or photo before saving the memory.");
      return;
    }
    setSaving(true);
    setFormError("");
    setFormSuccess("");
    try {
      await onAdd({ ...form, title: form.title.trim() || "Photo Memory", created_by: user.name, user_email: user.email, _file: file });
      setForm({ title: "", note: "", date: new Date().toISOString().split("T")[0], is_favorite: false, created_by: user.name, user_email: user.email });
      setFile(null);
      setFormSuccess("Memory saved successfully.");
      setTimeout(() => { setShowForm(false); setFormSuccess(""); }, 800);
    } catch (error: any) {
      setFormError(error?.message || "Memory could not be saved. Please check Supabase SQL and storage permissions.");
    } finally {
      setSaving(false);
    }
  };

  const sorted = [...memories].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-5 md:p-8 space-y-5 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "Lora, serif" }}>Memories</h2>
          <p className="text-sm text-muted-foreground">Friendship moments and notes</p>
        </div>
        <Btn onClick={() => setShowForm(true)} size="sm"><Plus size={14} /> Add Memory</Btn>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold">New Memory</p>
            <button onClick={() => setShowForm(false)} disabled={saving}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <div className="grid gap-3">
            <Input label="Memory Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="What's this memory about?" />
            <Input label="Date" type="date" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Upload Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl bg-input-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {file && <p className="text-xs text-muted-foreground mt-1">Selected: {file.name}</p>}
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">Note</label>
              <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Describe this memory…"
                className="w-full rounded-xl bg-input-background border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none h-24" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_favorite} onChange={e => setForm(f => ({ ...f, is_favorite: e.target.checked }))}
                className="rounded border-border accent-primary" />
              <span className="text-sm font-medium text-foreground">Mark as important</span>
            </label>
            {formError && <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">{formError}</div>}
            {formSuccess && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">{formSuccess}</div>}
            <div className="flex gap-2 pt-1">
              <Btn onClick={handleAdd} size="sm" className="flex-1 justify-center" disabled={saving}><Check size={14} /> {saving ? "Saving…" : "Save Memory"}</Btn>
              <Btn onClick={() => setShowForm(false)} variant="ghost" size="sm" disabled={saving}>Cancel</Btn>
            </div>
          </div>
        </Card>
      )}

      {sorted.length === 0 ? (
        <EmptyState icon={<BookOpen size={24} />} title="No memories yet" desc="Save photos and notes here." />
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-violet-200 via-sky-200 to-violet-200 md:left-6" />
          <div className="flex flex-col gap-5">
            {sorted.map((memory, i) => (
              <div key={memory.id} className="flex gap-6 relative group">
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 shadow-sm border-2 border-card",
                  i % 3 === 0 ? "bg-violet-400" : i % 3 === 1 ? "bg-sky-400" : "bg-amber-400"
                )}>
                  <BookOpen size={14} className="text-white" />
                </div>
                <Card className="flex-1 hover:shadow-md transition-all overflow-hidden">
                  {(memory.image_url || memory.file_url) && (
                    <a href={memory.image_url || memory.file_url || "#"} target="_blank" rel="noreferrer" className="block -mx-5 -mt-5 mb-4">
                      <img src={memory.image_url || memory.file_url || ""} alt={memory.title} className="w-full max-h-72 object-cover" />
                    </a>
                  )}
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-foreground">{memory.title}</p>
                        {memory.is_favorite && <Star size={14} className="text-amber-400 fill-amber-400" />}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Calendar size={10} /> {formatDate(memory.date)} · by {personLabelFromEmail(memory.user_email, memory.created_by)}
                      </p>
                      {memory.note && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{memory.note}</p>}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                      <button onClick={() => onToggleFavorite(memory.id)} className="w-7 h-7 rounded-lg hover:bg-amber-50 flex items-center justify-center transition-all">
                        <Star size={13} className={memory.is_favorite ? "text-amber-400 fill-amber-400" : "text-muted-foreground"} />
                      </button>
                      <button onClick={() => onDelete(memory.id)} className="w-7 h-7 rounded-lg hover:bg-rose-50 flex items-center justify-center transition-all">
                        <Trash2 size={13} className="text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Profile Page ───────────────────────────────────────────────────── */

function ProfilePage({ user, darkMode, onToggleDark, onLogout, onUpdateName, onChangePassword }: {
  user: AppUser; darkMode: boolean; onToggleDark: () => void; onLogout: () => void;
  onUpdateName: (name: string) => Promise<void> | void;
  onChangePassword: (password: string) => Promise<void> | void;
}) {
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState(user.name);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const runSafely = async (action: () => Promise<void> | void, successText: string) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(successText);
    } catch (err: any) {
      setError(err?.message || "Action failed. Please check Supabase and try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = () => runSafely(async () => {
    if (!name.trim()) throw new Error("Name cannot be empty.");
    await onUpdateName(name.trim());
    setShowEdit(false);
  }, "Profile updated successfully.");

  const savePassword = () => runSafely(async () => {
    if (newPassword.length < 6) throw new Error("Password must be at least 6 characters.");
    if (newPassword !== confirmPassword) throw new Error("Passwords do not match.");
    await onChangePassword(newPassword);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }, "Password changed successfully. Use the new password next time.");

  return (
    <div className="p-5 md:p-8 space-y-5 pb-24 md:pb-8 max-w-lg">
      <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "Lora, serif" }}>Profile & Settings</h2>

      <Card className="text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-400 to-sky-400 flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4 shadow-lg">
          {user.name[0]}
        </div>
        <h3 className="font-bold text-lg text-foreground">{user.name}</h3>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold">
          <div className="w-2 h-2 rounded-full bg-emerald-400" /> You are logged in on FriendNest
        </div>
      </Card>

      {(message || error) && (
        <div className={cn("rounded-xl px-4 py-3 text-sm font-semibold border", message ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200")}>
          {message || error}
        </div>
      )}

      <Card>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Preferences</p>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon size={18} className="text-violet-500" /> : <Sun size={18} className="text-amber-500" />}
              <div>
                <p className="text-sm font-semibold text-foreground">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Switch appearance</p>
              </div>
            </div>
            <button
              onClick={onToggleDark}
              className={cn("w-12 h-6 rounded-full relative transition-all duration-300", darkMode ? "bg-primary" : "bg-muted")}
            >
              <div className={cn("w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all duration-300", darkMode ? "left-6" : "left-0.5")} />
            </button>
          </div>

          <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
            <Bell size={18} className="text-violet-500 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              <p className="text-xs text-muted-foreground">FriendNest shows in-app alerts only. Google will not send SMS or Gmail notification messages from this website.</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Account</p>
        <div className="flex flex-col gap-2">
          <button onClick={() => { setShowEdit(v => !v); setShowPassword(false); setError(""); setMessage(""); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-all text-left w-full">
            <Edit size={16} className="text-violet-500" />
            <span className="text-sm font-medium text-foreground">Edit Profile</span>
            <ChevronRight size={14} className="ml-auto text-muted-foreground" />
          </button>

          {showEdit && (
            <div className="rounded-xl border border-border p-3 bg-muted/30 space-y-3">
              <Input label="Display Name" value={name} onChange={setName} placeholder="Enter your name" />
              <Btn onClick={saveProfile} size="sm" disabled={saving}><Check size={14} /> {saving ? "Saving…" : "Save Profile"}</Btn>
            </div>
          )}

          <button onClick={() => { setShowPassword(v => !v); setShowEdit(false); setError(""); setMessage(""); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-all text-left w-full">
            <Lock size={16} className="text-violet-500" />
            <span className="text-sm font-medium text-foreground">Change Password</span>
            <ChevronRight size={14} className="ml-auto text-muted-foreground" />
          </button>

          {showPassword && (
            <div className="rounded-xl border border-border p-3 bg-muted/30 space-y-3">
              <Input label="New Password" type="password" value={newPassword} onChange={setNewPassword} placeholder="Minimum 6 characters" />
              <Input label="Confirm Password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter password" />
              <Btn onClick={savePassword} size="sm" disabled={saving}><Lock size={14} /> {saving ? "Updating…" : "Update Password"}</Btn>
            </div>
          )}

          <button onClick={onLogout} className="flex items-center gap-3 p-3 rounded-xl hover:bg-rose-50 transition-all text-left w-full group">
            <LogOut size={16} className="text-rose-400 group-hover:text-rose-600" />
            <span className="text-sm font-medium text-rose-500 group-hover:text-rose-700">Sign Out</span>
          </button>
        </div>
      </Card>

      <p className="text-center text-xs text-muted-foreground pt-2">
        FriendNest · Private friendship space
      </p>
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────────── */

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [page, setPage] = useState<Page>("login");
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Data state (local + Supabase sync)
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [friendStatus, setFriendStatus] = useState<UserStatus | null>(null);
  const [lastSeenChatAt, setLastSeenChatAt] = useState("");
  const [clockTick, setClockTick] = useState(Date.now());

  const channelRef = useRef<RealtimeChannel | null>(null);
  const dataChannelRef = useRef<RealtimeChannel | null>(null);
  const statusChannelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) activateSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) activateSession(session);
      else { setSession(null); setAppUser(null); setPage("login"); }
    });

    return () => {
      subscription.unsubscribe();
      channelRef.current?.unsubscribe();
      dataChannelRef.current?.unsubscribe();
      statusChannelRef.current?.unsubscribe();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (statusPollRef.current) clearInterval(statusPollRef.current);
    };
  }, []);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Recalculate stale online status regularly.
  useEffect(() => {
    const id = setInterval(() => setClockTick(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const getSavedLoginName = (email: string) => {
    return localStorage.getItem(`friendnest-name-${normalizeEmail(email)}`) || "";
  };

  const getDisplayName = (sess: Session) => {
    const email = normalizeEmail(sess.user.email || "");
    const metadataName = sess.user.user_metadata?.full_name || sess.user.user_metadata?.name || "";
    const savedName = getSavedLoginName(email);
    return (savedName || metadataName || (email === AISHWARYA_EMAIL ? AISHWARYA_NAME : "Akshay")).trim();
  };

  const withSignedUrls = async <T extends { file_path?: string | null; file_url?: string | null }>(items: T[]): Promise<T[]> => {
    return Promise.all(items.map(async item => {
      if (!item.file_path) return item;
      const { data } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(item.file_path, 60 * 60 * 24);
      return { ...item, file_url: data?.signedUrl || item.file_url || null };
    }));
  };

  const uploadPrivateFile = async (folder: string, file?: File | null) => {
    if (!file || !appUser) return {};
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${folder}/${appUser.id}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) throw error;
    const { data } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, 60 * 60 * 24);
    return {
      file_path: path,
      file_url: data?.signedUrl || null,
      file_name: file.name,
      file_mime: file.type || null,
      file_size: file.size,
    };
  };

  const getFriendEmailFor = (user: AppUser) => {
    return isAishwaryaEmail(user.email) ? MY_EMAIL : AISHWARYA_EMAIL;
  };

  const updateOwnStatus = async (user: AppUser, isOnline = true) => {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from("user_status").upsert({
        email: normalizeEmail(user.email),
        user_id: user.id,
        name: user.name,
        is_online: isOnline,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "email" });
    } catch (error) {
      console.warn("FriendNest status update failed:", error);
    }
  };

  const loadFriendStatus = async (friendEmail: string) => {
    if (!friendEmail) {
      setFriendStatus(null);
      return;
    }
    try {
      const { data } = await supabase
        .from("user_status")
        .select("*")
        .eq("email", normalizeEmail(friendEmail))
        .maybeSingle();
      setFriendStatus(data as UserStatus | null);
    } catch (error) {
      console.warn("FriendNest friend status load failed:", error);
      setFriendStatus(null);
    }
  };

  const startStatusSystem = (user: AppUser) => {
    const friendEmail = getFriendEmailFor(user);

    statusChannelRef.current?.unsubscribe();
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (statusPollRef.current) clearInterval(statusPollRef.current);

    updateOwnStatus(user, true);
    loadFriendStatus(friendEmail);

    heartbeatRef.current = setInterval(() => updateOwnStatus(user, true), 25_000);
    statusPollRef.current = setInterval(() => {
      loadFriendStatus(friendEmail);
      setClockTick(Date.now());
    }, 20_000);

    if (friendEmail) {
      statusChannelRef.current = supabase
        .channel(`friendnest-user-status-${normalizeEmail(friendEmail)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "user_status", filter: `email=eq.${normalizeEmail(friendEmail)}` }, payload => {
          setFriendStatus(payload.new as UserStatus);
          setClockTick(Date.now());
        })
        .subscribe();
    }
  };

  const activateSession = (sess: Session) => {
    const email = normalizeEmail(sess.user.email || "");
    if (!isAllowedEmail(email)) {
      supabase.auth.signOut();
      setLoginError("This website is private and only available for Akshay and Aishwarya.");
      return;
    }
    setSession(sess);
    const name = getDisplayName(sess);
    const user: AppUser = { id: sess.user.id, email, name };
    setAppUser(user);
    setLastSeenChatAt(localStorage.getItem(`friendnest-last-seen-chat-${email}`) || "");
    loadData(sess.user.id);
    subscribeToMessages();
    subscribeToAppData(sess.user.id);
    startStatusSystem(user);

    if (isAishwaryaName(name) && isBelatedBirthdayActive()) {
      setPage("birthday-surprise");
    } else {
      setPage("dashboard");
    }
  };

  const loadData = async (userId: string) => {
    // Messages
    const { data: msgs } = await supabase.from("messages").select("*").order("created_at", { ascending: true }).limit(200);
    if (msgs) setMessages(msgs);

    // Tasks
    const { data: tsks } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (tsks) setTasks(tsks);

    // Certificates
    const { data: certs } = await supabase.from("certificates").select("*").order("created_at", { ascending: false });
    if (certs) setCertificates(await withSignedUrls(certs));

    // Media
    const { data: med } = await supabase.from("media_files").select("*").order("created_at", { ascending: false });
    if (med) setMedia(await withSignedUrls(med));

    // Memories
    const { data: mems } = await supabase.from("memories").select("*").order("date", { ascending: false });
    if (mems) setMemories(await withSignedUrls(mems));
  };

  const subscribeToMessages = () => {
    channelRef.current?.unsubscribe();
    channelRef.current = supabase
      .channel("messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, payload => {
        setMessages(prev => prev.some(m => m.id === (payload.new as Message).id) ? prev : [...prev, payload.new as Message]);
      })
      .subscribe();
  };

  const subscribeToAppData = (userId: string) => {
    dataChannelRef.current?.unsubscribe();
    dataChannelRef.current = supabase
      .channel("friendnest-app-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => loadData(userId))
      .on("postgres_changes", { event: "*", schema: "public", table: "certificates" }, () => loadData(userId))
      .on("postgres_changes", { event: "*", schema: "public", table: "media_files" }, () => loadData(userId))
      .on("postgres_changes", { event: "*", schema: "public", table: "memories" }, () => loadData(userId))
      .subscribe();
  };

  const handleLogin = async (email: string, password: string, name: string) => {
    if (!isSupabaseConfigured) {
      setLoginError("Supabase is not configured correctly. Check your .env file: VITE_SUPABASE_URL or VITE_SUPABASE_PROJECT_ID, and VITE_SUPABASE_ANON_KEY.");
      return;
    }
    const cleanedEmail = normalizeEmail(email);
    const cleanedName = name.trim();
    if (!cleanedName || !cleanedEmail || !password) { setLoginError("Please fill in name, email, and password."); return; }
    if (!isAllowedEmail(cleanedEmail)) {
      setLoginError("This website is private and only available for Akshay and Aishwarya.");
      return;
    }
    setLoginLoading(true);
    setLoginError("");
    localStorage.setItem(`friendnest-name-${cleanedEmail}`, cleanedName);
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanedEmail, password });
    if (error) {
      setLoginError(error.message === "Invalid login credentials" ? "Wrong email or password. Please try again." : error.message);
    } else if (data.session) {
      await supabase.auth.updateUser({ data: { full_name: cleanedName } });
      activateSession(data.session);
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    const userToClose = appUser;
    channelRef.current?.unsubscribe();
    dataChannelRef.current?.unsubscribe();
    statusChannelRef.current?.unsubscribe();
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (statusPollRef.current) clearInterval(statusPollRef.current);
    if (userToClose) await updateOwnStatus(userToClose, false);
    setFriendStatus(null);
    setSession(null);
    setAppUser(null);
    setMessages([]);
    setTasks([]);
    setCertificates([]);
    setMedia([]);
    setMemories([]);
    setPage("login");
    await supabase.auth.signOut();
  };

  const handleUpdateProfileName = async (newName: string) => {
    if (!appUser) return;
    const cleanedName = newName.trim();
    const { error } = await supabase.auth.updateUser({ data: { full_name: cleanedName } });
    if (error) throw error;
    localStorage.setItem(`friendnest-name-${appUser.email}`, cleanedName);
    const updatedUser = { ...appUser, name: cleanedName };
    setAppUser(updatedUser);
    await updateOwnStatus(updatedUser, true);
  };

  const handleChangePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const markChatAsRead = useCallback(() => {
    if (!appUser) return;
    const latestReadAt = messages[messages.length - 1]?.created_at || new Date().toISOString();
    localStorage.setItem(`friendnest-last-seen-chat-${appUser.email}`, latestReadAt);
    setLastSeenChatAt(latestReadAt);
  }, [appUser, messages]);

  // Chat
  const handleSendMessage = async (content: string) => {
    if (!appUser) return;
    const msg = { user_id: appUser.id, user_name: appUser.name, content, type: "text" as const, created_at: new Date().toISOString(), pinned: false };
    const { data, error } = await supabase.from("messages").insert(msg).select().single();
    if (error) throw error;
    const savedMessage = (data || { ...msg, id: crypto.randomUUID() }) as Message;
    setMessages(prev => prev.some(m => m.id === savedMessage.id) ? prev : [...prev, savedMessage]);
    // Also reload shortly after sending. This keeps both accounts correct even if Realtime is delayed.
    setTimeout(() => { if (appUser) loadData(appUser.id); }, 400);
  };

  // Tasks
  const handleAddTask = async (task: Omit<Task, "id" | "created_at">) => {
    const newTask = {
      ...task,
      created_by: appUser?.name || task.created_by,
      created_by_email: appUser?.email || task.created_by_email,
      completed_by: null,
      completed_by_email: null,
      completed_at: null,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("tasks").insert(newTask).select().single();
    if (error) throw error;
    if (data) setTasks(prev => [data, ...prev]);
    else setTasks(prev => [{ ...newTask, id: crypto.randomUUID() }, ...prev]);
  };

  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task || !appUser) return;
    const completing = task.status !== "completed";
    const updates = completing
      ? { status: "completed" as const, completed_by: appUser.name, completed_by_email: appUser.email, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      : { status: "pending" as const, completed_by: null, completed_by_email: null, completed_at: null, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("tasks").update(updates).eq("id", id);
    if (error) throw error;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDeleteTask = async (id: string) => {
    await supabase.from("tasks").delete().eq("id", id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Certificates
  const handleAddCert = async (cert: NewCertificate) => {
    const { _file, ...certFields } = cert;
    const uploadInfo = await uploadPrivateFile("certificates", _file);
    const newCert = { ...certFields, user_name: appUser?.name || certFields.user_name, user_email: appUser?.email || certFields.user_email, ...uploadInfo, created_at: new Date().toISOString() };
    const { data, error } = await supabase.from("certificates").insert(newCert).select().single();
    if (error) throw error;
    if (data) setCertificates(prev => [data, ...prev]);
    else setCertificates(prev => [{ ...newCert, id: crypto.randomUUID() } as Certificate, ...prev]);
  };

  const handleDeleteCert = async (id: string) => {
    const cert = certificates.find(c => c.id === id);
    if (cert?.file_path) await supabase.storage.from(STORAGE_BUCKET).remove([cert.file_path]);
    await supabase.from("certificates").delete().eq("id", id);
    setCertificates(prev => prev.filter(c => c.id !== id));
  };

  // Media
  const handleAddMedia = async (item: NewMediaItem) => {
    const { _file, ...itemFields } = item;
    const uploadInfo = await uploadPrivateFile("media", _file);
    const newItem = { ...itemFields, user_name: appUser?.name || itemFields.user_name, user_email: appUser?.email || itemFields.user_email, ...uploadInfo, created_at: new Date().toISOString() };
    const { data, error } = await supabase.from("media_files").insert(newItem).select().single();
    if (error) throw error;
    if (data) setMedia(prev => [data, ...prev]);
    else setMedia(prev => [{ ...newItem, id: crypto.randomUUID() } as MediaItem, ...prev]);
  };

  const handleDeleteMedia = async (id: string) => {
    const item = media.find(m => m.id === id);
    if (item?.file_path) await supabase.storage.from(STORAGE_BUCKET).remove([item.file_path]);
    await supabase.from("media_files").delete().eq("id", id);
    setMedia(prev => prev.filter(m => m.id !== id));
  };

  // Memories
  const handleAddMemory = async (mem: NewMemory) => {
    const { _file, ...memFields } = mem;
    const uploadInfo = await uploadPrivateFile("memories", _file);
    const newMem = { ...memFields, created_by: appUser?.name || memFields.created_by, user_email: appUser?.email || memFields.user_email, ...uploadInfo, image_url: uploadInfo.file_url || memFields.image_url || null, created_at: new Date().toISOString() };
    const { data, error } = await supabase.from("memories").insert(newMem).select().single();
    if (error) throw error;
    if (data) setMemories(prev => [data, ...prev]);
    else setMemories(prev => [{ ...newMem, id: crypto.randomUUID() } as Memory, ...prev]);
  };

  const handleDeleteMemory = async (id: string) => {
    const mem = memories.find(m => m.id === id);
    if (mem?.file_path) await supabase.storage.from(STORAGE_BUCKET).remove([mem.file_path]);
    await supabase.from("memories").delete().eq("id", id);
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  const handleToggleFavoriteMemory = async (id: string) => {
    const mem = memories.find(m => m.id === id);
    if (!mem) return;
    await supabase.from("memories").update({ is_favorite: !mem.is_favorite }).eq("id", id);
    setMemories(prev => prev.map(m => m.id === id ? { ...m, is_favorite: !m.is_favorite } : m));
  };

  // Save birthday as memory
  const handleSaveBirthdayMemory = async () => {
    const mem = {
      title: `Aishwarya's Belated Birthday ${new Date().getFullYear()}`,
      note: "Belated Happy Birthday Aishwarya! You are truly special. May this year be filled with success, happiness, peace, and beautiful memories.",
      date: new Date().toISOString().split("T")[0],
      is_favorite: true,
      created_by: appUser?.name || "Friend",
    };
    await handleAddMemory(mem);
  };

  const unreadMessages = appUser
    ? messages.filter(m => m.user_id !== appUser.id && (!lastSeenChatAt || new Date(m.created_at).getTime() > new Date(lastSeenChatAt).getTime()))
    : [];
  const friendEmail = appUser ? getFriendEmailFor(appUser) : "";
  const friendName = appUser ? personLabelFromEmail(friendEmail, isAishwaryaEmail(appUser.email) ? "Akshay" : AISHWARYA_NAME) : "Friend";
  const friendOnline = Boolean(friendStatus?.is_online && isOnlineStatusFresh(friendStatus.last_seen));
  void clockTick;

  // Login screen
  if (page === "login" || !appUser || !session) {
    return <LoginPage onLogin={handleLogin} error={loginError} loading={loginLoading} />;
  }

  // Birthday pages
  if (page === "birthday-surprise") {
    return <BirthdaySurprisePage onOpenSurprise={() => setPage("birthday-card")} onDashboard={() => setPage("dashboard")} />;
  }

  if (page === "birthday-card") {
    return <BirthdayCardPage onSaveMemory={handleSaveBirthdayMemory} onDashboard={() => setPage("dashboard")} />;
  }

  // Main app layout
  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "Nunito, sans-serif" }}>
      <Sidebar page={page} onNav={setPage} user={appUser} onLogout={handleLogout} />
      <main className="md:ml-64 min-h-screen">
        {/* Dev testing bar */}
        <div className="bg-gradient-to-r from-pink-50 to-violet-50 border-b border-pink-100 px-5 py-2 flex items-center justify-between">
          <span className="text-xs text-pink-700 font-semibold">{isBelatedBirthdayActive() ? "Belated birthday surprise active today only!" : "Belated birthday surprise has stopped auto-opening."}</span>
          <button onClick={() => setPage("birthday-surprise")} className="text-xs text-violet-700 font-bold hover:underline flex items-center gap-1">
            <Sparkles size={12} /> Preview Belated Surprise
          </button>
        </div>

        {page === "dashboard" && <DashboardPage user={appUser} onNav={setPage} tasks={tasks} unreadMessages={unreadMessages} />}
        {page === "chat" && <ChatPage user={appUser} messages={messages} onSend={handleSendMessage} friendOnline={friendOnline} friendName={friendName} friendLastSeen={friendStatus?.last_seen || null} onMarkRead={markChatAsRead} />}
        {page === "tasks" && <TasksPage user={appUser} tasks={tasks} onAdd={handleAddTask} onToggle={handleToggleTask} onDelete={handleDeleteTask} />}
        {page === "certificates" && <CertificatesPage user={appUser} certificates={certificates} onAdd={handleAddCert} onDelete={handleDeleteCert} />}
        {page === "media" && <MediaPage user={appUser} media={media} onAdd={handleAddMedia} onDelete={handleDeleteMedia} />}
        {page === "memories" && <MemoriesPage user={appUser} memories={memories} onAdd={handleAddMemory} onDelete={handleDeleteMemory} onToggleFavorite={handleToggleFavoriteMemory} />}
        {page === "profile" && <ProfilePage user={appUser} darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} onLogout={handleLogout} onUpdateName={handleUpdateProfileName} onChangePassword={handleChangePassword} />}
      </main>
      <BottomNav page={page} onNav={setPage} />
    </div>
  );
}
