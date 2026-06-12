import React, { useState, useEffect } from "react";
import { 
  Laptop, Phone, Plus, RefreshCw, Layers, ShieldAlert, 
  Heart, Activity, FileText, UserPlus, Sliders, Calendar, 
  DollarSign, Settings, HardDrive, Clock, HelpCircle, LogOut
} from "lucide-react";
import PhoneSimulator from "./components/PhoneSimulator.js";
import AdminDashboard from "./components/AdminDashboard.js";
import { Profile, Shift, LogAbsensi, JadwalKaryawan, Holiday, AttendanceRule, RekapBulanan } from "./types.js";

export default function App() {
  const [activeRole, setActiveRole] = useState<"employee" | "admin">("employee");
  const [loading, setLoading] = useState<boolean>(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Authentication states
  const [loggedInUser, setLoggedInUser] = useState<Profile | null>(null);
  const [pinOrNip, setPinOrNip] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Active tab state lifted up to create a unified sleek sidebar navigation
  const [activeTab, setActiveTab] = useState<
    "rules" | "shifts" | "employees" | "holidays" | "hardware" | "correction" | "reports"
  >("reports");

  // Core synchronized application state
  const [appData, setAppData] = useState<{
    profiles: Profile[];
    shifts: Shift[];
    jadwal_karyawan: JadwalKaryawan[];
    log_absensi: LogAbsensi[];
    adms_commands: any[];
    rules: AttendanceRule;
    holidays: Holiday[];
    rekap_bulanan: RekapBulanan[];
  }>({
    profiles: [],
    shifts: [],
    jadwal_karyawan: [],
    log_absensi: [],
    adms_commands: [],
    rules: {
      toleransi_terlambat_menit: 15,
      tarif_potongan_terlambat_per_menit: 2000,
      tarif_denda_alpa: 150000,
      lembur_mulai_menit: 480,
      tunjangan_kehadiran_harian: 50000
    },
    holidays: [],
    rekap_bulanan: []
  });

  // Fetch all databases state from the fullstack Express backend API
  const fetchStateData = async () => {
    try {
      const res = await fetch("/api/data");
      if (res.ok) {
        const payload = await res.json();
        setAppData(payload);
        setErrorState(null);
      } else {
        setErrorState("Backend return non-200 state log.");
      }
    } catch (err) {
      setErrorState("Gagal sinkronisasi data dengan backend Puskesmas.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStateData();
    // Poll every 4 seconds to simulate active commands & physical terminal synchronization instantly on UI!
    const pollTimer = setInterval(() => {
      fetchStateData();
    }, 4000);
    return () => clearInterval(pollTimer);
  }, []);

  // Post wrappers to modify full-stack database
  const handleUpdateRules = async (rules: AttendanceRule) => {
    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rules)
    });
    return res.json();
  };

  const handleUpdateHoliday = async (holiday: any) => {
    const res = await fetch("/api/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(holiday)
    });
    return res.json();
  };

  const handleManageProfile = async (profile: any) => {
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    return res.json();
  };

  const handleDeleteProfile = async (id: string) => {
    const res = await fetch("/api/profiles/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    return res.json();
  };

  const handleManageShift = async (shift: any) => {
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shift)
    });
    return res.json();
  };

  const handleDeleteShift = async (id: number) => {
    const res = await fetch("/api/shifts/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    return res.json();
  };

  const handleAssignBulk = async (scheduleData: any) => {
    const res = await fetch("/api/schedule/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scheduleData)
    });
    return res.json();
  };

  const handleAddLogMobile = async (logData: {
    pin_mesin: string;
    waktu_scan: string;
    metode: "HP_Radius" | "HP_Luar" | "Tugas_Dinas";
    foto_selfie_url?: string;
    koordinat: string;
    device_ip?: string;
    device_fingerprint?: string;
    signature_token?: string;
  }) => {
    const res = await fetch("/api/absensi/mobile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logData)
    });
    return res.json();
  };

  const handleManualCorrection = async (correction: any) => {
    const res = await fetch("/api/absensi/koreksi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(correction)
    });
    return res.json();
  };

  const handleAddAdmsCommand = async (cmd: any) => {
    const res = await fetch("/api/adms/commands/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cmd)
    });
    return res.json();
  };

  const handleSimulateMachineScan = async (scan: any) => {
    const res = await fetch("/api/adms/simulate_machine_scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scan)
    });
    return res.json();
  };

  const handleTriggerCalculate = async () => {
    const res = await fetch("/api/reports/calculate", {
      method: "POST"
    });
    return res.json();
  };

  const handleResetDb = async () => {
    const res = await fetch("/api/reset", {
      method: "POST"
    });
    fetchStateData();
    return res.json();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center gap-3 font-sans">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-550" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Loading UPT Puskesmas Sedau Cloud DB...</h2>
      </div>
    );
  }

  // Handle credentials login submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinOrNip.trim()) return;
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin_or_nip: pinOrNip })
      });
      const data = await res.json();
      if (data.success) {
        setLoggedInUser(data.profile);
        setActiveRole(data.role || (data.profile.privilege_mesin === 3 ? "admin" : "employee"));
        if (data.role === "admin" || data.profile.privilege_mesin === 3) {
          setActiveTab("reports");
        }
      } else {
        setAuthError(data.error || "NIP/NIK atau PIN salah / tidak terdaftar.");
      }
    } catch (err) {
      console.error(err);
      setAuthError("Gagal berinteraksi dengan server sinkronisasi.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!loggedInUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Abstract background blobs */}
        <div className="absolute top-[-20%] left-[-10%] bg-blue-900/20 blur-3xl w-[500px] h-[500px] rounded-full"></div>
        <div className="absolute bottom-[-20%] right-[-10%] bg-emerald-900/20 blur-3xl w-[500px] h-[500px] rounded-full"></div>

        <div className="relative w-full max-w-sm bg-white border border-slate-205 p-6 rounded-3xl shadow-2xl flex flex-col gap-5">
          <div className="flex flex-col items-center text-center gap-2">
            <img src="/logo.svg" alt="UPT Puskesmas Sedau" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
            <div>
              <h1 className="text-base font-black text-slate-950 tracking-tight">Sistem Presensi Terpadu</h1>
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mt-0.5">UPT Puskesmas Sedau</p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-650 mb-1.5 uppercase tracking-wider">
                Masukkan NIP / NIK atau PIN Anda
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 1991001 atau 1001"
                value={pinOrNip}
                onChange={e => setPinOrNip(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-350 rounded-xl p-3 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-mono"
              />
            </div>

            {authError && (
              <div className="text-xs font-semibold text-red-650 bg-red-50 border border-red-150 p-2.5 rounded-xl flex items-center gap-1.5 leading-snug">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-black py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-md uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>MEMVERIFIKASI...</span>
                </>
              ) : (
                <>
                  <span>MASUK PORTAL PRESENSI</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Active label calculations based on selected tab
  const getTabLabel = () => {
    if (activeRole === "employee") return "Portal Swafoto Karyawan";
    switch (activeTab) {
      case "reports": return "Pelaporan Kehadiran Terpadu";
      case "employees": return "Database Profil Karyawan";
      case "shifts": return "Manajemen Shift Dinas bergilir";
      case "correction": return "Formulir Koreksi Absensi";
      case "rules": return "Aturan Toleransi & Tarif Denda";
      case "holidays": return "Kalender Hari Libur Nasional";
      case "hardware": return "Simulator Mesin Solution X601";
      default: return "Dashboard Overview";
    }
  };

  const isUserAdmin = loggedInUser?.role === "admin" || loggedInUser?.privilege_mesin === 3;

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 font-sans overflow-hidden">
      
      {/* Sleek LEFT SIDEBAR - Only visible if logged in user is admin */}
      {isUserAdmin && (
        <aside className="w-68 bg-white border-r border-slate-200 flex flex-col shrink-0">
          
          {/* Brand logo header */}
          <div className="p-5 border-b border-slate-150 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="UPT Puskesmas Sedau Logo" className="w-9 h-9 object-contain" referrerPolicy="no-referrer" />
              <div>
                <h1 className="text-sm font-extrabold leading-tight tracking-tight text-slate-900">Presensi Terpadu</h1>
                <p className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-widest">UPT Puskesmas Sedau</p>
              </div>
            </div>
          </div>

          {/* Sidebar Nav content */}
          <div className="flex-1 p-4 space-y-5 overflow-y-auto custom-scrollbar">
            
            {/* Section A: Role selection (LAPTOP vs MOBILE VIEWPORT SIMULATOR) */}
            <div className="space-y-1">
              <div className="px-3 py-1 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">TIPE ANTARMUKA</div>
              <button
                onClick={() => setActiveRole("admin")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold leading-none transition-all cursor-pointer ${
                  activeRole === "admin"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Laptop className="w-4 h-4 shrink-0" />
                <span>Laptop Admin Utama</span>
              </button>
              <button
                onClick={() => {
                  setActiveRole("employee");
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold leading-none transition-all cursor-pointer ${
                  activeRole === "employee"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Phone className="w-4 h-4 shrink-0" />
                <span>HP Mobile Karyawan</span>
              </button>
            </div>

            {/* Section B: Admin Panel Navigation tabs */}
            {activeRole === "admin" && (
              <div className="space-y-4 pt-2">
                
                {/* Category 1: Real-time Reports */}
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">UTAMA & PELAPORAN</div>
                  
                  <button
                    onClick={() => setActiveTab("reports")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold leading-none transition-all cursor-pointer ${
                      activeTab === "reports"
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>Pelaporan Lengkap</span>
                  </button>
                </div>

                {/* Category 2: Master Data */}
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">DATA MASTER</div>

                  <button
                    onClick={() => setActiveTab("employees")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold leading-none transition-all cursor-pointer ${
                      activeTab === "employees"
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <UserPlus className="w-4 h-4 text-slate-400" />
                    <span>Profil Karyawan</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("shifts")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold leading-none transition-all cursor-pointer ${
                      activeTab === "shifts"
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Sliders className="w-4 h-4 text-slate-400" />
                    <span>Master Jam Shift</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("holidays")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold leading-none transition-all cursor-pointer ${
                      activeTab === "holidays"
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Hari Libur Nasional</span>
                  </button>
                </div>

                {/* Category 3: System, Devices, and Rules */}
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">SISTEM & KONTROL</div>

                  <button
                    onClick={() => setActiveTab("correction")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold leading-none transition-all cursor-pointer ${
                      activeTab === "correction"
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 text-slate-400" />
                    <span>Koreksi Lupa Absen</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("rules")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold leading-none transition-all cursor-pointer ${
                      activeTab === "rules"
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Aturan Toleransi</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("hardware")}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold leading-none transition-all cursor-pointer ${
                      activeTab === "hardware"
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <HardDrive className="w-4 h-4 text-slate-400" />
                    <span>Simulator Mesin X601</span>
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* Bottom Sidebar specs / control signature */}
          <div className="p-4 border-t border-slate-150 bg-slate-50">
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 text-[11px] leading-tight text-slate-500">
              <div className="flex justify-between font-medium">
                <span>SDK:</span>
                <span className="font-bold text-slate-700">ADMS Push 2.0</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Geofence:</span>
                <span className="font-bold text-blue-600">Active (WebRTC)</span>
              </div>
              
              <button
                onClick={() => {
                  if (confirm("Reset ulang seluruh database simulasi UPT Puskesmas Sedau ke setelan awal?")) {
                    handleResetDb();
                  }
                }}
                className="w-full mt-1.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center block"
              >
                Reset Database Simulasi
              </button>
            </div>
          </div>

        </aside>
      )}

      {/* RIGHT MAIN CONTAINER */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8fafc]">
        
        {/* TOP HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0">
          <div className="flex items-center gap-3">
            {!isUserAdmin && (
              <img src="/logo.svg" alt="UPT Puskesmas Sedau Logo" className="w-8 h-8 object-contain shrink-0" referrerPolicy="no-referrer" />
            )}
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 leading-none">{getTabLabel()}</h2>
              {!isUserAdmin && <p className="text-[9px] text-emerald-800 font-extrabold uppercase tracking-widest mt-1">UPT Puskesmas Sedau</p>}
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-150 text-[10px] font-bold px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              MESIN ONLINE
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {activeRole === "admin" && (
              <button
                onClick={handleTriggerCalculate}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 text-white" />
                <span>Hitung Statistik Log</span>
              </button>
            )}
            
            <div className="h-6 w-[1.5px] bg-slate-200"></div>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-150 flex items-center justify-center text-blue-700 font-extrabold text-xs select-none">
                {loggedInUser ? loggedInUser.nama_lengkap.substring(0, 2).toUpperCase() : "AU"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold leading-none text-slate-800">{loggedInUser ? loggedInUser.nama_lengkap : "Admin Utama"}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">{isUserAdmin ? "Super Administrator" : loggedInUser?.jabatan || "Karyawan Unit"}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setLoggedInUser(null);
                setPinOrNip("");
                setActiveRole("employee");
              }}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-150 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ml-1"
              title="Keluar dari Akun"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        {/* CONTENT REGION */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {/* Error State Banner */}
          {errorState && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorState}</span>
            </div>
          )}

          {activeRole === "admin" ? (
            /* View A: Admin Dashboard containing specific activeTab */
            <div className="max-w-7xl mx-auto">
              <AdminDashboard
                data={appData}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onUpdateRules={handleUpdateRules}
                onUpdateHoliday={handleUpdateHoliday}
                onManageProfile={handleManageProfile}
                onDeleteProfile={handleDeleteProfile}
                onManageShift={handleManageShift}
                onDeleteShift={handleDeleteShift}
                onAssignBulk={handleAssignBulk}
                onManualCorrection={handleManualCorrection}
                onAddAdmsCommand={handleAddAdmsCommand}
                onSimulateMachineScan={handleSimulateMachineScan}
                onTriggerCalculate={handleTriggerCalculate}
                onResetDb={handleResetDb}
                onRefresh={fetchStateData}
              />
            </div>
          ) : (
            /* View B: Mobile phone UI Simulator frame centered precisely with Sleek Interface */
            <div className="flex flex-col items-center justify-center py-4 w-full max-w-sm mx-auto">
              <PhoneSimulator
                profiles={appData.profiles}
                shifts={appData.shifts}
                schedules={appData.jadwal_karyawan}
                holidays={appData.holidays}
                logs={appData.log_absensi}
                onAddLog={handleAddLogMobile}
                onRefresh={fetchStateData}
                loggedInPin={loggedInUser?.pin_mesin}
                rules={appData.rules}
              />
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
