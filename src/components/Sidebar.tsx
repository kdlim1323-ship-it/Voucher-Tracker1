/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, UserRole } from "../types";
import {
  LayoutDashboard,
  FileSpreadsheet,
  Building2,
  Users2,
  LogOut,
  ShieldAlert,
  UserCircle,
  HelpCircle
} from "lucide-react";

interface SidebarProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  officeName: string;
}

export default function Sidebar({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  officeName
}: SidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Determine tabs based on permissions (Office Management and User Management are Admin/Owner-only)
  const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OWNER;

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "tracker", label: "Transaction Tracker", icon: FileSpreadsheet }
  ];

  const adminItems = [
    { id: "offices", label: "Office Code Management", icon: Building2 },
    { id: "users", label: "User Management", icon: Users2 }
  ];

  return (
    <>
      {/* Sidebar navigation panel */}
      <aside className="w-64 bg-[#1e293b] text-slate-300 flex flex-col shrink-0 h-screen font-sans shadow-xl border-r border-slate-700/50">
        
        {/* App Branding */}
        <div className="p-6 border-b border-slate-700/50 flex items-center gap-3 bg-slate-900/30">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-md">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 tracking-wide uppercase font-display">
              RPPT System
            </h2>
            <span className="text-[10px] text-teal-400 font-semibold tracking-wider uppercase">
              Voucher Tracker
            </span>
          </div>
        </div>

        {/* Logged in User Profile Info */}
        <div className="p-4 mx-4 my-4 bg-slate-800/40 border border-slate-700/50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700/40 flex items-center justify-center border border-slate-600/50 text-slate-200">
              <UserCircle className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-slate-100 truncate">
                {currentUser.employeeName}
              </h3>
              <p className="text-[10px] text-slate-400 truncate">
                {currentUser.position}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex flex-col gap-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Role:</span>
              <span className="text-teal-400 font-semibold">{currentUser.role.split(" / ")[0]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Employee ID:</span>
              <span className="text-slate-300 truncate max-w-[110px]" title={currentUser.employeeId}>
                {currentUser.employeeId}
              </span>
            </div>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-3 mb-2">
            Main Menu
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-blue-600/10 text-white border border-blue-500/20 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Admin Section */}
          {isAdmin && (
            <div className="pt-6 space-y-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-3 mb-2">
                Administration
              </div>
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-blue-600/10 text-white border border-blue-500/20 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* Footer with Logout */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-900/20">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all focus:outline-none"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Secure Logout</span>
          </button>
          <div className="text-center text-[9px] text-slate-500 mt-3 font-mono">
            Time: 2026-07-02 UTC
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-950/75 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-xl shadow-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-1">
              Confirm Secure Logout
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Are you sure you want to end your current session and sign out of the RPPT tracker? Any unsaved action form details will be lost.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-colors focus:outline-none"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
