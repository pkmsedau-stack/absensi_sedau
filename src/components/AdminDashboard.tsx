import React, { useState, useEffect } from "react";
import { 
  Laptop, Settings, Calendar, Sliders, Database, ShieldAlert,
  Server, HardDrive, Play, Plus, Trash2, CheckCircle2, 
  HelpCircle, RefreshCw, FileSpreadsheet, FileText, UserPlus,
  Compass, MapPin, Printer, AlertTriangle, Fingerprint, RefreshCcw, DollarSign, ListCollapse, Clock
} from "lucide-react";
import * as XLSX from "xlsx";
import { Profile, Shift, LogAbsensi, JadwalKaryawan, Holiday, AttendanceRule, RekapBulanan } from "../types";
import GeofenceMap from "./GeofenceMap";

interface AdminDashboardProps {
  data: {
    profiles: Profile[];
    shifts: Shift[];
    jadwal_karyawan: JadwalKaryawan[];
    log_absensi: LogAbsensi[];
    adms_commands: any[];
    rules: AttendanceRule;
    holidays: Holiday[];
    rekap_bulanan: RekapBulanan[];
    supabase?: {
      connected: boolean;
      last_message: string;
      configured: boolean;
    };
  };
  activeTab: "rules" | "shifts" | "employees" | "holidays" | "hardware" | "correction" | "reports";
  setActiveTab: (tab: any) => void;
  onUpdateRules: (rules: AttendanceRule) => Promise<any>;
  onUpdateHoliday: (holiday: any) => Promise<any>;
  onManageProfile: (profile: any) => Promise<any>;
  onDeleteProfile: (id: string) => Promise<any>;
  onManageShift: (shift: any) => Promise<any>;
  onDeleteShift: (id: number) => Promise<any>;
  onAssignBulk: (scheduleData: any) => Promise<any>;
  onManualCorrection: (correction: any) => Promise<any>;
  onAddAdmsCommand: (cmd: any) => Promise<any>;
  onSimulateMachineScan: (scan: any) => Promise<any>;
  onTriggerCalculate: () => Promise<any>;
  onRefresh: () => void;
  onResetDb: () => Promise<any>;
}

export default function AdminDashboard({
  data,
  activeTab,
  setActiveTab,
  onUpdateRules,
  onUpdateHoliday,
  onManageProfile,
  onDeleteProfile,
  onManageShift,
  onDeleteShift,
  onAssignBulk,
  onManualCorrection,
  onAddAdmsCommand,
  onSimulateMachineScan,
  onTriggerCalculate,
  onRefresh,
  onResetDb
}: AdminDashboardProps) {

  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // States for forms
  const [newRule, setNewRule] = useState<AttendanceRule>({ 
    ...data.rules,
    geofence_latitude: data.rules?.geofence_latitude ?? -0.8986,
    geofence_longitude: data.rules?.geofence_longitude ?? 108.9711,
    geofence_radius_meter: data.rules?.geofence_radius_meter ?? 100
  });

  useEffect(() => {
    setNewRule({
      ...data.rules,
      geofence_latitude: data.rules?.geofence_latitude ?? -0.8986,
      geofence_longitude: data.rules?.geofence_longitude ?? 108.9711,
      geofence_radius_meter: data.rules?.geofence_radius_meter ?? 100
    });
  }, [data.rules]);

  const [selectedMapLog, setSelectedMapLog] = useState<any | null>(null);
  const [newHoliday, setNewHoliday] = useState({ tanggal: "", keterangan: "" });
  
  // Shift states
  const [editingShift, setEditingShift] = useState<Partial<Shift>>({
    nama_shift: "",
    jam_masuk: "08:00:00",
    jam_pulang: "16:00:00",
    toleransi_terlambat_menit: 15,
    harus_check_in: true,
    harus_check_out: true
  });

  // Profile states
  const [editingProfile, setEditingProfile] = useState<Partial<Profile>>({
    pin_mesin: "",
    nama_lengkap: "",
    jabatan: "",
    departemen: "UPT Puskesmas Sedau",
    gaji_pokok: 4000000,
    privilege_mesin: 0,
    status_kepegawaian: "PNS"
  });

  // Custom confirmation modal state for sandboxed iframe safety
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Ya, Hapus",
    onConfirm: () => {}
  });

  // Plotting shift states
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>("1");
  const [startDateStr, setStartDateStr] = useState<string>("2026-06-12");
  const [endDateStr, setEndDateStr] = useState<string>("2026-06-12");

  // Correction states
  const [correctionPin, setCorrectionPin] = useState<string>("");
  const [correctionDate, setCorrectionDate] = useState<string>("2026-06-12");
  const [correctionTime, setCorrectionTime] = useState<string>("07:30");
  const [correctionStatus, setCorrectionStatus] = useState<string>("Tepat Waktu");
  const [correctionNotes, setCorrectionNotes] = useState<string>("Koreksi lupa absen");

  // Hardware emulation simulation states
  const [emulatedMachinePin, setEmulatedMachinePin] = useState<string>("1001");
  const [emulatedLogTime, setEmulatedLogTime] = useState<string>("07:25");
  const [emulatedDate, setEmulatedDate] = useState<string>("2026-06-12");
  const [emulatedIsCheckIn, setEmulatedIsCheckIn] = useState<boolean>(true);

  // Pulling Solution X601 states
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [pullResult, setPullResult] = useState<any | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<string>("2026-06");
  const [isPullingMonthly, setIsPullingMonthly] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handlePullSolutionX601 = async () => {
    setIsPulling(true);
    setPullResult(null);
    try {
      const response = await fetch("/api/adms/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const resData = await response.json();
      if (resData.success) {
        setPullResult(resData.pulledDetails);
        triggerNotification("success", "Sinkronisasi & Tarik Data dari Solution X601 Berhasil!");
        onRefresh();
      } else {
        triggerNotification("error", "Gagal menarik data dari mesin Solution X601.");
      }
    } catch (err) {
      console.error(err);
      triggerNotification("error", "Error koneksi ke API sinkronisasi Solution X601.");
    } finally {
      setIsPulling(false);
    }
  };

  // Helper notification handler
  const triggerNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  // 1. Submit Rules
  const handleRulesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateRules(newRule);
      triggerNotification("success", "Aturan absensi & tunjangan berhasil diperbarui!");
      onRefresh();
    } catch {
      triggerNotification("error", "Gagal memperbarui aturan.");
    }
  };

  // 2. Submit Holiday
  const handleHolidaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.tanggal || !newHoliday.keterangan) return;
    try {
      await onUpdateHoliday(newHoliday);
      setNewHoliday({ tanggal: "", keterangan: "" });
      triggerNotification("success", "Tanggal libur nasional berhasil ditambahkan!");
      onRefresh();
    } catch {
      triggerNotification("error", "Gagal menambah libur.");
    }
  };

  const deleteHoliday = async (id: number) => {
    try {
      await onUpdateHoliday({ id, isDelete: true });
      triggerNotification("success", "Hari libur dihapus!");
      onRefresh();
    } catch {
      triggerNotification("error", "Gagal menghapus.");
    }
  };

  // 3. Submit Profile
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile.pin_mesin || !editingProfile.nama_lengkap) {
       triggerNotification("error", "PIN Mesin dan Nama Lengkap wajib diisi!");
       return;
    }
    try {
       await onManageProfile(editingProfile);
       setEditingProfile({
         pin_mesin: "",
         nama_lengkap: "",
         jabatan: "",
         departemen: "UPT Puskesmas Sedau",
         gaji_pokok: 4000000,
         privilege_mesin: 0,
         status_kepegawaian: "PNS"
       });
       triggerNotification("success", "Data karyawan & perintah sinkronisasi ADMS Solution X601 sukses digenerasikan!");
       onRefresh();
    } catch {
       triggerNotification("error", "Gagal menyimpan profil karyawan.");
    }
  };

  const handleProfileDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Konfirmasi Hapus Pegawai",
      message: "Apakah Anda benar-benar yakin ingin menghapus karyawan ini? Seluruh jadwal terplot dan data fingerprint pada mesin Solution X601 jarak jauh akan dihapus sepenuhnya.",
      confirmText: "Ya, Hapus",
      onConfirm: async () => {
        try {
          await onDeleteProfile(id);
          triggerNotification("success", "Data profil karyawan berhasil dihapus!");
          onRefresh();
        } catch {
          triggerNotification("error", "Gagal menghapus.");
        }
      }
    });
  };

  // 4. Submit Shift
  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift.nama_shift) return;
    try {
      await onManageShift(editingShift);
      setEditingShift({
        nama_shift: "",
        jam_masuk: "08:00:00",
        jam_pulang: "16:00:00",
        toleransi_terlambat_menit: 15,
        harus_check_in: true,
        harus_check_out: true
      });
      triggerNotification("success", "Master Jam Kerja Shift Dinas berhasil ditambahkan!");
      onRefresh();
    } catch {
      triggerNotification("error", "Gagal menyimpan shift.");
    }
  };

  const handleShiftDelete = async (id: number) => {
    try {
      await onDeleteShift(id);
      triggerNotification("success", "Shift Dinas terhapus!");
      onRefresh();
    } catch {
      triggerNotification("error", "Gagal mendelete shift.");
    }
  };

  // 5. Submit Bulk Schedule Plotting
  const handleBulkScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmployees.length === 0) {
      triggerNotification("error", "Harap pilih minimal 1 karyawan!");
      return;
    }
    try {
      await onAssignBulk({
        karyawan_ids: selectedEmployees,
        shift_id: selectedShiftId,
        tanggal_mulai: startDateStr,
        tanggal_selesai: endDateStr
      });
      setSelectedEmployees([]);
      triggerNotification("success", `Sukses melakukan cetak plotting shift bergilir masal sebanyak ${selectedEmployees.length} karyawan!`);
      onRefresh();
    } catch {
      triggerNotification("error", "Gagal plotting jadwal bergilir.");
    }
  };

  // Toggle selection for bulk plotting
  const handleEmployeeToggle = (id: string) => {
    if (selectedEmployees.includes(id)) {
      setSelectedEmployees(selectedEmployees.filter(item => item !== id));
    } else {
      setSelectedEmployees([...selectedEmployees, id]);
    }
  };

  // 6. Submit Manual Correction Form
  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionPin) {
      triggerNotification("error", "Harap pilih karyawan.");
      return;
    }
    const finalWaktuScan = `${correctionDate}T${correctionTime}:00+08:00`;
    try {
      await onManualCorrection({
        pin_mesin: correctionPin,
        waktu_scan: finalWaktuScan,
        status_kehadiran: correctionStatus,
        keterangan_kalkulasi: "[KOREKSI ADMIN] " + correctionNotes
      });
      triggerNotification("success", "Formulir Koreksi Manual Lupa Absen / Tugas Dinas Luar Berhasil Diproses!");
      setCorrectionNotes("Koreksi manual");
      onRefresh();
    } catch {
      triggerNotification("error", "Gagal memproses koreksi.");
    }
  };

  // 7. Simulate Physical Hardware scan Solution X601
  const handleHardwareEmulationSubmit = async () => {
    const finalWaktuScan = `${emulatedDate}T${emulatedLogTime}:00+08:00`;
    try {
      const res = await onSimulateMachineScan({
        pin_mesin: emulatedMachinePin,
        waktu_scan: finalWaktuScan,
        isCheckIn: emulatedIsCheckIn
      });
      triggerNotification("success", `[Solution X601 Simulator] Tempel sidik jari sukses! Mengirim ADMS raw log ke server.`);
      onRefresh();
    } catch (err: any) {
      triggerNotification("error", "Mesin gagal sinkronisasi dengan cloud runtime.");
    }
  };

  // 8. Quick Trigger manual calculation
  const handleTriggerCalculate = async () => {
    try {
      const res = await onTriggerCalculate();
      triggerNotification("success", "Kalkulasi data kehadiran berhasil dihitung ulang secara real-time!");
      onRefresh();
    } catch {
      triggerNotification("error", "Gagal memicu kalkulator backend.");
    }
  };

  // 9. Sync options command to ADMS queue as Sync Time
  const handleTimeSync = async () => {
    const formattedNow = new Date().toISOString().replace("T", " ").substring(0, 19);
    try {
      await onAddAdmsCommand({
        pin_mesin: "ALL",
        command_text: `SET OPTIONS DateTime=${formattedNow}`
      });
      triggerNotification("success", "Perintah sinkronisasi jam global berhasil dikirim ke antrean mesin ADMS.");
      onRefresh();
    } catch {
      triggerNotification("error", "Gagal sinkron.");
    }
  };

  // 10. Copy biological template simulation
  const handleBiometricPull = (profile: Profile, type: "finger" | "face") => {
    const textToCopy = type === "finger" ? profile.fingerprint_template : profile.face_template;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      triggerNotification("success", `Data biometrik ${type === "finger" ? "sidik jari" : "pindai wajah"} disalin ke clipboard!`);
    } else {
      triggerNotification("error", `Template biometrik ${type === "finger" ? "Sidik Jari" : "Swafoto"} kosong pada karyawan ini.`);
    }
  };

  // Filter variables
  const filteredLogs = (data.log_absensi || []).filter(la => la.waktu_scan && la.waktu_scan.includes(selectedMonth));
  const filteredRekap = (data.rekap_bulanan || []).filter(r => r.bulan_tahun === selectedMonth);

  // 11. Excel Export Engine using SheetJS (xlsx)
  const handleExportExcel = () => {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // --- SHEET 1: DETAIL LOGS ---
      // AOA format header to make it look highly polished and professional
      const wsLogsAOA: any[][] = [
        ["LAPORAN DETAIL ABSENSI BULANAN PEGAWAI"],
        ["UPT PUSKESMAS SEDAU – KOTA SINGKAWANG"],
        [`PERIODE TARIKAN DATA BULANAN: ${selectedMonth}`],
        [`Dicetak otomatis pada: ${new Date().toLocaleDateString("id-ID")} ${new Date().toLocaleTimeString("id-ID")}`],
        [], // Empty buffer row
        [
          "No",
          "PIN Mesin (ID)",
          "Nama Lengkap",
          "NIP / NIK",
          "Jabatan / Unit",
          "Tanggal Scan",
          "Hari",
          "Jam Scan",
          "Metode Pencetakan",
          "Shift Kerja Pegawai",
          "Koreksi Manual",
          "Status Kehadiran",
          "Keterangan / Deskripsi Kalkulasi"
        ]
      ];

      // Append logs data dynamically
      filteredLogs
        .sort((a,b) => new Date(a.waktu_scan).getTime() - new Date(b.waktu_scan).getTime())
        .forEach((la, index) => {
          const emp = data.profiles.find(p => p.pin_mesin === la.pin_mesin);
          
          // Determine shift info
          const dateStr = la.waktu_scan.split("T")[0];
          const schedule = data.jadwal_karyawan?.find(jk => jk.karyawan_id === emp?.id && jk.tanggal === dateStr);
          let shiftInfo = "Biasa (Default)";
          const dateObj = new Date(la.waktu_scan);

          if (schedule) {
            const s = data.shifts.find(sh => sh.id === schedule.shift_id);
            if (s) shiftInfo = s.nama_shift;
          } else if (emp && (
            emp.jabatan?.toLowerCase().includes("ugd") || 
            emp.jabatan?.toLowerCase().includes("igd") || 
            emp.jabatan?.toLowerCase().includes("kia") || 
            emp.jabatan?.toLowerCase().includes("bidan") || 
            emp.jabatan?.toLowerCase().includes("perawat")
          )) {
            // auto-detect shift for shift units
            const inTimeStr = dateObj.toTimeString().split(" ")[0];
            let minDiff = Infinity;
            let selectedShift = data.shifts[0];
            data.shifts.forEach(s => {
              const [h1, m1] = inTimeStr.split(":").map(Number);
              const [h2, m2] = s.jam_masuk.split(":").map(Number);
              const diff = Math.abs((h1 * 60 + m1) - (h2 * 60 + m2));
              if (diff < minDiff) {
                minDiff = diff;
                selectedShift = s;
              }
            });
            if (selectedShift) {
              shiftInfo = `⚡ Auto: ${selectedShift.nama_shift}`;
            }
          }

          const showDate = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
          const showDay = dateObj.toLocaleDateString("id-ID", { weekday: "long" });
          const showTime = dateObj.toLocaleTimeString("id", { hour: "numeric", minute: "numeric" }) + " WITA";

          wsLogsAOA.push([
            index + 1,
            la.pin_mesin,
            emp ? emp.nama_lengkap : "Unknown",
            emp?.nip_nik || "-",
            emp ? emp.jabatan : "Unknown",
            showDate,
            showDay,
            showTime,
            la.metode,
            shiftInfo,
            la.is_koreksi_manual ? "Ya" : "Tidak",
            la.status_kehadiran,
            la.keterangan_kalkulasi || ""
          ]);
        });

      const wsLogs = XLSX.utils.aoa_to_sheet(wsLogsAOA);

      // --- SHEET 2: MONTHLY RECAP & GAJI THP ---
      const wsSummaryAOA: any[][] = [
        ["LAPORAN REKAPITULASI BULANAN & TAKE HOME PAY (THP) PEGAWAI"],
        ["UPT PUSKESMAS SEDAU – KOTA SINGKAWANG"],
        [`PERIODE LAPORAN REKAPITULASI: ${selectedMonth}`],
        [`Dicetak otomatis pada: ${new Date().toLocaleDateString("id-ID")} ${new Date().toLocaleTimeString("id-ID")}`],
        [], // Empty buffer row
        [
          "No",
          "PIN",
          "Nama Karyawan/Pegawai",
          "NIP / NIK",
          "Status Kepegawaian",
          "Jabatan",
          "Gaji Pokok",
          "Bulan-Tahun",
          "Hari Kerja Efektif",
          "Total Hadir (Hari)",
          "Terlambat (Menit)",
          "Pulang Cepat (Menit)",
          "Lembur (Menit)",
          "Izin (Hari)",
          "Sakit (Hari)",
          "Cuti (Hari)",
          "Fakultatif (Hari)",
          "Tugas Dinas (Hari)",
          "Alpa / Tanpa Keterangan (Hari)",
          "Gaji Bersih THP (IDR)"
        ]
      ];

      filteredRekap.forEach((rekap, index) => {
        const emp = data.profiles.find(p => p.pin_mesin === rekap.pin_mesin);
        wsSummaryAOA.push([
          index + 1,
          rekap.pin_mesin,
          emp ? emp.nama_lengkap : "Unknown",
          emp?.nip_nik || "-",
          emp?.status_kepegawaian || "PNS/P3K",
          emp ? emp.jabatan : "Unknown",
          emp ? emp.gaji_pokok : 0,
          rekap.bulan_tahun,
          rekap.hari_normal_kerja,
          rekap.jml_kehadiran,
          rekap.total_terlambat_menit,
          rekap.total_pulang_cepat_menit,
          rekap.total_lembur_menit,
          rekap.total_izin || 0,
          rekap.total_sakit || 0,
          rekap.total_cuti || 0,
          rekap.total_fakultatif || 0,
          rekap.total_tugas_dinas || 0,
          rekap.total_absent + (rekap.total_tanpa_keterangan || 0),
          rekap.gaji_bersih_thp
        ]);
      });

      const wsSummary = XLSX.utils.aoa_to_sheet(wsSummaryAOA);

      // Append worksheets to workbook
      XLSX.utils.book_append_sheet(wb, wsLogs, "Riwayat Log Absensi");
      XLSX.utils.book_append_sheet(wb, wsSummary, "Rekap Bulanan & Gaji");

      // Save file dynamically with selected month in name
      XLSX.writeFile(wb, `Laporan_Bulanan_Puskesmas_Sedau_${selectedMonth}.xlsx`);
      triggerNotification("success", `Berkas Excel Modern Bulan ${selectedMonth} Berhasil Didownload!`);
    } catch (e) {
      console.error(e);
      triggerNotification("error", "Gagal menghasilkan file Excel Modern.");
    }
  };

  // Calculate real-time stats for the cards
  const totalKaryawan = data.profiles.length;
  const totalHadir = data.log_absensi.filter(l => l.waktu_scan.includes("2026-06-12")).map(l => l.pin_mesin).filter((v, i, a) => a.indexOf(v) === i).length;
  const totalTerlambat = data.log_absensi.filter(l => l.waktu_scan.includes("2026-06-12") && l.status_kehadiran === "Terlambat").length;
  const totalAntrean = data.adms_commands.filter(cmd => cmd.status === "Antri").length;
  const estimasiThpNominal = data.rekap_bulanan.reduce((acc, rb) => {
    return acc + (rb.gaji_bersih_thp || 0);
  }, 0) || (totalKaryawan * 4250000); // fallback based on registered profiles and standard wages

  const attendanceRatio = totalKaryawan ? Math.round((totalHadir / totalKaryawan) * 100) : 0;

  return (
    <div className="space-y-6">
      
      {/* Sleek Stats Card Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
        
        {/* Card 1: Total Kehadiran */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Kehadiran Hari Ini</p>
            <h3 className="text-2xl font-black text-slate-800">
              {totalHadir} <span className="text-sm font-medium text-slate-400 font-sans">/ {totalKaryawan} Pegawai</span>
            </h3>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold mb-1">
              <span>Rasio Kehadiran</span>
              <span>{attendanceRatio}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                style={{ width: `${attendanceRatio}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card 2: Terlambat Masuk */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Terlambat Masuk</p>
            <h3 className="text-2xl font-black text-amber-600">{totalTerlambat} Orang</h3>
          </div>
          <div className="mt-4 pt-1.5 text-[10px] text-slate-400 font-medium italic border-t border-slate-100 flex justify-between">
            <span>Batas Toleransi:</span>
            <span className="font-bold text-slate-600">{data.rules.toleransi_terlambat_menit} Menit</span>
          </div>
        </div>

        {/* Card 3: Antrean ADMS & Status Koneksi Mesin Solution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status Mesin Biometrik Solution X601</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-extrabold text-emerald-800 uppercase tracking-wider">Terhubung / Aktif (Online)</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">
              Koneksi ADMS Real-time • <span className="font-bold text-slate-700">{totalAntrean} Antrean Data</span>
            </p>
          </div>
          <div className="mt-4 flex gap-1 items-center justify-between border-t border-slate-100 pt-1.5">
            <span className="text-[10px] font-bold text-slate-400 font-mono">ADMS Heartbeat</span>
            <div className="flex gap-1.5">
              <span className="h-1.5 w-2.5 rounded bg-emerald-500 animate-pulse"></span>
              <span className="h-1.5 w-2.5 rounded bg-emerald-400"></span>
              <span className="h-1.5 w-2.5 rounded bg-emerald-300"></span>
            </div>
          </div>
        </div>

        {/* Card 4: Status Database Supabase Cloud */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status Database Supabase Cloud</p>
            {data.supabase?.configured ? (
              <div className="flex items-center gap-2 mt-1">
                {data.supabase?.connected ? (
                  <>
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-extrabold text-emerald-800 uppercase tracking-wider">AKTIF (Connected)</span>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-3 w-3">
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                    <span className="text-sm font-extrabold text-amber-800 uppercase tracking-wider">Offline atau Syncing</span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <span className="relative flex h-3 w-3">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-400"></span>
                </span>
                <span className="text-xs font-extrabold text-red-800 uppercase tracking-wider">Belum Terpasang (.env)</span>
              </div>
            )}
            <p className="text-[9px] text-slate-500 mt-1 font-semibold leading-relaxed">
              {data.supabase?.last_message || "Menunggu data konfigurasi di file .env..."}
            </p>
          </div>
          <div className="mt-4 flex gap-1 items-center justify-between border-t border-slate-100 pt-1.5">
            <span className="text-[10px] font-bold text-slate-400 font-mono">SUPABASE INTEGRATION</span>
            {data.supabase?.connected ? (
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded text-[8px] font-bold">LIVE SYNC</span>
            ) : (
              <span className="bg-amber-50 text-amber-805 border border-amber-200 px-1.5 py-0.5 rounded text-[8px] font-bold">LOKAL ENGINE</span>
            )}
          </div>
        </div>

      </div>

      {/* Database state notification bar */}
      {notification && (
        <div className={`p-4 text-xs font-semibold flex items-center gap-1.5 rounded-xl border transition-all ${
          notification.type === "success" 
            ? "bg-blue-50 text-blue-800 border-blue-200" 
            : "bg-red-50 text-red-800 border-red-200"
        }`}>
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{notification.text}</span>
        </div>
      )}

      {/* Active Tab Panel Widget */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 text-left">

        
        {/* TAB 1: Attendance rules and late calculations */}
        {activeTab === "rules" && (
          <form onSubmit={handleRulesSubmit} className="max-w-2xl bg-white border border-slate-200 p-6 rounded-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-800 leading-none">Attendance Rules & Late Threshold Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Toleransi Keterlambatan Absensi (Menit)
                </label>
                <input
                  type="number"
                  value={newRule.toleransi_terlambat_menit}
                  onChange={e => setNewRule({ ...newRule, toleransi_terlambat_menit: parseInt(e.target.value) || 0 })}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Aturan Denda Potongan / Menit Terlambat (Nominal Rp)
                </label>
                <input
                  type="number"
                  value={newRule.tarif_potongan_terlambat_per_menit}
                  onChange={e => setNewRule({ ...newRule, tarif_potongan_terlambat_per_menit: parseInt(e.target.value) || 0 })}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Denda Alpa Mangkir (Tanpa Keterangan) Per Hari
                </label>
                <input
                  type="number"
                  value={newRule.tarif_denda_alpa}
                  onChange={e => setNewRule({ ...newRule, tarif_denda_alpa: parseInt(e.target.value) || 0 })}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Tunjangan Uang Kehadiran Harian (Rp)
                </label>
                <input
                  type="number"
                  value={newRule.tunjangan_kehadiran_harian}
                  onChange={e => setNewRule({ ...newRule, tunjangan_kehadiran_harian: parseInt(e.target.value) || 0 })}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-teal-500"
                />
              </div>
            </div>

            {/* Geofencing Coordinates and Radius Configurations */}
            <div className="border-t border-slate-200 pt-4 mt-4">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider mb-2 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-teal-600 animate-spin" style={{ animationDuration: "12s" }} />
                <span>Pengaturan Geofencing & Koordinat Lokasi Puskesmas</span>
              </h4>
              <p className="text-[11px] text-slate-500 mb-4 leading-relaxed font-medium">
                Tetapkan titik koordinat pusat UPT Puskesmas Sedau beserta batas radius toleransi GPS dalam satuan meter. Karyawan yang melakukan absensi mandiri di luar batasan ini akan ditandai mengalami absensi di luar radius (HP_Luar).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Titik Koordinat Lintang (Latitude)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newRule.geofence_latitude ?? -0.8986}
                    onChange={e => setNewRule({ ...newRule, geofence_latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-teal-500"
                    placeholder="-0.898600"
                  />
                  <span className="text-[9px] text-slate-400 font-mono mt-1 block">Default: -0.8986 (Equator Sedau)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Titik Koordinat Bujur (Longitude)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={newRule.geofence_longitude ?? 108.9711}
                    onChange={e => setNewRule({ ...newRule, geofence_longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-teal-500"
                    placeholder="108.971100"
                  />
                  <span className="text-[9px] text-slate-400 font-mono mt-1 block">Default: 108.9711</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Batas Maksimum Radius (Meter)
                  </label>
                  <input
                    type="number"
                    value={newRule.geofence_radius_meter ?? 100}
                    onChange={e => setNewRule({ ...newRule, geofence_radius_meter: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-teal-500"
                    placeholder="100"
                  />
                  <span className="text-[9px] text-slate-400 font-mono mt-1 block">Toleransi radius valid (Default: 100m)</span>
                </div>
              </div>

              {/* Real-time Map Preview for Admin testing coordinates */}
              <div className="mt-4 max-w-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Pratinjau Geofence Peta Saat Ini:</span>
                <GeofenceMap
                  centerLat={newRule.geofence_latitude ?? -0.8986}
                  centerLng={newRule.geofence_longitude ?? 108.9711}
                  userLat={newRule.geofence_latitude ?? -0.8986}
                  userLng={newRule.geofence_longitude ?? 108.9711}
                  radiusMeter={newRule.geofence_radius_meter ?? 100}
                  distance={0}
                  isWithinRadius={true}
                  username="Pusat Puskesmas"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 bg-teal-600 hover:bg-teal-700 text-slate-950 font-bold py-2 px-4 rounded-xl text-xs flex justify-center items-center gap-1 text-center cursor-pointer max-w-max transition-all"
            >
              Simpan Aturan Regulasi
            </button>
          </form>
        )}

        {/* TAB 2: Holidays and national calendar */}
        {activeTab === "holidays" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <form onSubmit={handleHolidaySubmit} className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Tambah Tanggal Libur Nasional</h3>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal Hari Libur</label>
                <input
                  type="date"
                  value={newHoliday.tanggal}
                  onChange={e => setNewHoliday({ ...newHoliday, tanggal: e.target.value })}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Keterangan Libur</label>
                <input
                  type="text"
                  placeholder="Contoh: Idul Fitri"
                  value={newHoliday.keterangan}
                  onChange={e => setNewHoliday({ ...newHoliday, keterangan: e.target.value })}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-teal-500"
                />
              </div>
              <button
                type="submit"
                className="mt-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg text-xs leading-none cursor-pointer text-center"
              >
                + Daftarkan Liburan
              </button>
            </form>
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Kalender Tanggal Merah</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <th className="p-2">ID</th>
                      <th className="p-2">Tanggal</th>
                      <th className="p-2">Keterangan Libur Nasional</th>
                      <th className="p-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.holidays.map(h => (
                      <tr key={h.id} className="border-b border-slate-100 text-slate-700 hover:bg-slate-50">
                        <td className="p-2 font-mono">#{h.id}</td>
                        <td className="p-2 font-semibold text-slate-800">{h.tanggal}</td>
                        <td className="p-2 text-slate-600">{h.keterangan}</td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => deleteHoliday(h.id)}
                            className="text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Shift Management & Timetables Plotting */}
        {activeTab === "shifts" && (
          <div className="flex flex-col gap-6">
            
            {/* Shifts list */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form shift */}
              <form onSubmit={handleShiftSubmit} className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Tambah Detail Jam Kerja Shift</h3>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Deskripsi Shift</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Dinas Pagi Rawat"
                    value={editingShift.nama_shift}
                    onChange={e => setEditingShift({ ...editingShift, nama_shift: e.target.value })}
                    className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-teal-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Jam Masuk (HH:MM:SS)</label>
                    <input
                      type="text"
                      required
                      placeholder="07:30:00"
                      value={editingShift.jam_masuk}
                      onChange={e => setEditingShift({ ...editingShift, jam_masuk: e.target.value })}
                      className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Jam Pulang (HH:MM:SS)</label>
                    <input
                      type="text"
                      required
                      placeholder="14:00:00"
                      value={editingShift.jam_pulang}
                      onChange={e => setEditingShift({ ...editingShift, jam_pulang: e.target.value })}
                      className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-teal-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Menit Batas Toleransi Lambat</label>
                  <input
                    type="number"
                    value={editingShift.toleransi_terlambat_menit}
                    onChange={e => setEditingShift({ ...editingShift, toleransi_terlambat_menit: parseInt(e.target.value) || 0 })}
                    className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-teal-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl text-xs cursor-pointer text-center"
                >
                  + Tambahkan Master Shift
                </button>
              </form>

              {/* Shifts master table */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Master Dinas Timetables</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <th className="p-2.5">ID</th>
                        <th className="p-2.5">Nama Shift Dinas</th>
                        <th className="p-2.5">Jam Masuk</th>
                        <th className="p-2.5">Jam Pulang</th>
                        <th className="p-2.5">Toleransi</th>
                        <th className="p-2.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.shifts.map(s => (
                        <tr key={s.id} className="border-b border-slate-100 text-slate-700 hover:bg-slate-50">
                          <td className="p-2.5 font-mono">#{s.id}</td>
                          <td className="p-2.5 font-bold text-slate-800">{s.nama_shift}</td>
                          <td className="p-2.5 font-mono text-emerald-600 font-bold">{s.jam_masuk}</td>
                          <td className="p-2.5 font-mono text-red-500 font-bold">{s.jam_pulang}</td>
                          <td className="p-2.5 font-mono">{s.toleransi_terlambat_menit} Menit</td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => handleShiftDelete(s.id)}
                              className="text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Mass Plotting Schedules */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl text-left">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Plotting Siklus Dinas Masal Mingguan/Bulanan Bergilir
              </h3>
              
              <form onSubmit={handleBulkScheduleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Step 1: Pilih Karyawan Tergabung ({selectedEmployees.length} dipilih)
                  </label>
                  <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50 flex flex-col gap-1.5">
                    {data.profiles.map(e => (
                      <label key={e.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded transition-colors text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(e.id)}
                          onChange={() => handleEmployeeToggle(e.id)}
                          className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 border-slate-400"
                        />
                        <span>[{e.pin_mesin}] {e.nama_lengkap} ({e.jabatan})</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Step 2: Pilih Jam Kerja Shift Tujuan
                    </label>
                    <select
                      value={selectedShiftId}
                      onChange={e => setSelectedShiftId(e.target.value)}
                      className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-teal-500"
                    >
                      {data.shifts.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.nama_shift} ({s.jam_masuk} - {s.jam_pulang})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Mulai Dinas</label>
                      <input
                        type="date"
                        value={startDateStr}
                        onChange={e => setStartDateStr(e.target.value)}
                        className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Berakhir</label>
                      <input
                        type="date"
                        value={endDateStr}
                        onChange={e => setEndDateStr(e.target.value)}
                        className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-slate-800 focus:outline-hidden focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-end">
                  <div className="bg-teal-50 border border-teal-150 p-4 rounded-xl text-xs mb-3 text-teal-800">
                    <p className="font-bold mb-1">ℹ️ Info Plotting Terpadu</p>
                    Karyawan yang sudah diploting pada tanggal yang sama akan otomatis ter-overwrite (mencegah double-shift) sesuai protokol database Supabase.
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-teal-650 hover:bg-teal-700 text-teal-950 font-black py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-xs uppercase tracking-wide flex items-center justify-center gap-1"
                  >
                    Cetak Jadwal Kerja Baru secara Masal
                  </button>
                </div>
              </form>
            </div>

          </div>
        )}

        {/* TAB 4: Employee Profiles List */}
        {activeTab === "employees" && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            
            {/* Employee Form */}
            <form onSubmit={handleProfileSubmit} className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col gap-3 h-fit">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Pendaftaran Karyawan Baru</h3>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PIN Mesin badgenumber (No. ID)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 1006"
                  value={editingProfile.pin_mesin}
                  onChange={e => setEditingProfile({ ...editingProfile, pin_mesin: e.target.value })}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Heri Prastyo, S.Kep"
                  value={editingProfile.nama_lengkap}
                  onChange={e => setEditingProfile({ ...editingProfile, nama_lengkap: e.target.value })}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jabatan Resmi</label>
                <input
                  type="text"
                  placeholder="Contoh: Kepala Puskesmas"
                  value={editingProfile.jabatan}
                  onChange={e => setEditingProfile({ ...editingProfile, jabatan: e.target.value })}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Departemen / Unit Kerja</label>
                <input
                  type="text"
                  placeholder="Contoh: Poli Umum"
                  value={editingProfile.departemen || ""}
                  onChange={e => setEditingProfile({ ...editingProfile, departemen: e.target.value })}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gaji Pokok Karyawan (Rp)</label>
                <input
                  type="number"
                  value={editingProfile.gaji_pokok}
                  onChange={e => setEditingProfile({ ...editingProfile, gaji_pokok: parseInt(e.target.value) || 0 })}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">NIP / NIK Karyawan</label>
                <input
                  type="text"
                  placeholder="Contoh: 1991006"
                  value={editingProfile.nip_nik || ""}
                  onChange={e => setEditingProfile({ ...editingProfile, nip_nik: e.target.value })}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-sans">Status Kepegawaian</label>
                <select
                  value={editingProfile.status_kepegawaian || "PNS"}
                  onChange={e => setEditingProfile({ ...editingProfile, status_kepegawaian: e.target.value as any })}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden"
                >
                  <option value="PNS">PNS (Pegawai Negeri Sipil)</option>
                  <option value="PPPK Penuh Waktu">PPPK Penuh Waktu</option>
                  <option value="PPPK Paruh Waktu">PPPK Paruh Waktu</option>
                  <option value="PKWT">PKWT (Kontrak Kerja)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-indigo-700 mb-1 flex items-center gap-1">
                  <span>🔒 Gembok IP (Hanya Admin)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 182.253.x.x / Reset untuk kosong"
                  value={editingProfile.device_ip || ""}
                  onChange={e => setEditingProfile({ ...editingProfile, device_ip: e.target.value || null })}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 bg-indigo-50/50 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-indigo-700 mb-1 flex items-center gap-1">
                  <span>🔒 Gembok HP SSID/GUID (Hanya Admin)</span>
                </label>
                <input
                  type="text"
                  placeholder="Misal: SECURE-HASH-GUID / Reset untuk kosong"
                  value={editingProfile.device_fingerprint || ""}
                  onChange={e => setEditingProfile({ ...editingProfile, device_fingerprint: e.target.value || null })}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 bg-indigo-50/50 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role Utama Aplikasi</label>
                <select
                  value={editingProfile.role || "employee"}
                  onChange={e => setEditingProfile({ ...editingProfile, role: e.target.value as "admin" | "employee" })}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden"
                >
                  <option value="employee">Karyawan</option>
                  <option value="admin">Administrator (Akses Dashboard)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Privilege Solution Device</label>
                <select
                  value={editingProfile.privilege_mesin}
                  onChange={e => setEditingProfile({ ...editingProfile, privilege_mesin: parseInt(e.target.value) || 0 })}
                  className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-800 focus:outline-hidden"
                >
                  <option value={0}>0 - Karyawan Biasa</option>
                  <option value={3}>3 - Administrator Mesin</option>
                </select>
              </div>
              <button
                type="submit"
                className="mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl text-xs cursor-pointer text-center transition-all"
              >
                + Daftarkan / Simpan & Push ke ADMS
              </button>
            </form>

            {/* List Employees Grid / Table */}
            <div className="xl:col-span-3 bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Database Karyawan UPT Puskesmas Sedau</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <th className="p-3">PIN/ID</th>
                      <th className="p-3">NIK / NIP</th>
                      <th className="p-3">Nama Lengkap & Role</th>
                      <th className="p-3">Jabatan & Dept</th>
                      <th className="p-3">Gaji Pokok</th>
                      <th className="p-3 text-center">Biometrik Wajah</th>
                      <th className="p-3 text-center">Biometrik Jari</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.profiles.map(p => (
                      <tr key={p.id} className="border-b border-slate-100 text-slate-700 hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-800">{p.pin_mesin}</td>
                        <td className="p-3 font-mono text-xs text-slate-600 font-bold">{p.nip_nik || p.pin_mesin}</td>
                        <td className="p-3">
                          <div>
                            <span className="font-bold text-slate-900 leading-none">{p.nama_lengkap}</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-semibold uppercase ${
                                p.role === "admin" || p.privilege_mesin === 3
                                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                                  : "bg-blue-105 text-blue-700 border border-blue-200"
                              }`}>
                                {p.role === "admin" || p.privilege_mesin === 3 ? "Admin App" : "Karyawan"}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">{p.id}</span>
                              <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-xs font-bold shrink-0">
                                {p.status_kepegawaian || "PNS"}
                              </span>
                            </div>
                            
                            {p.device_fingerprint ? (
                              <div 
                                className="flex items-center gap-1 mt-1 text-[8px] text-amber-700 bg-amber-50 border border-amber-200/50 rounded px-1.5 py-0.5 w-fit font-mono font-semibold" 
                                title={`IP Terikat: ${p.device_ip || '?'}`}
                              >
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shrink-0"></span>
                                <span>Gembok HP: {p.device_fingerprint.substring(0, 10)}</span>
                              </div>
                            ) : (
                              <div className="text-[8px] italic text-slate-400 mt-1">
                                HP Bebas (Belum Terikat)
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full text-[10px] font-medium block w-fit">
                              {p.jabatan}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{p.departemen || "UPT Puskesmas Sedau"}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono font-semibold">Rp {p.gaji_pokok.toLocaleString("id-ID")}</td>
                        
                        <td className="p-3 text-center">
                          {p.face_template ? (
                            <button
                              onClick={() => handleBiometricPull(p, "face")}
                              className="text-[10px] bg-sky-550 hover:bg-sky-600 text-sky-950 font-bold px-2 py-0.5 rounded cursor-pointer"
                              title="Salin string wajah ZKTeco"
                            >
                              Ready (Copy)
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Empty</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {p.fingerprint_template ? (
                            <button
                              onClick={() => handleBiometricPull(p, "finger")}
                              className="text-[10px] bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded cursor-pointer border border-teal-200"
                              title="Salin fingerprint data"
                            >
                              Ready (Copy)
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Empty</span>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex gap-1.5 justify-end items-center">
                            {p.device_fingerprint && (
                              <button
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: "Pelepasan Gembok HP",
                                    message: `Apakah Anda yakin ingin melepas Gembok HP karyawan "${p.nama_lengkap}"? Karyawan ini kemudian akan dapat mendaftarkan HP barunya kembali pada absensi selanjutnya.`,
                                    confirmText: "Ya, Lepas Gembok",
                                    onConfirm: async () => {
                                      try {
                                        const res = await fetch("/api/profiles/reset_device", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ pin_mesin: p.pin_mesin })
                                        });
                                        const resJson = await res.json();
                                        if (resJson.success) {
                                          triggerNotification("success", resJson.message || "Gembok HP berhasil dilepaskan!");
                                          onRefresh();
                                        } else {
                                          triggerNotification("error", resJson.error || "Gagal membuka gembok HP.");
                                        }
                                      } catch (err) {
                                        triggerNotification("error", "Gagal terhubung dengan server puskesmas.");
                                      }
                                    }
                                  });
                                }}
                                className="text-amber-700 hover:text-amber-850 bg-amber-50 border border-amber-200 hover:bg-amber-100 py-0.5 px-2 rounded-lg text-[9px] font-bold cursor-pointer transition-colors"
                                title="Setel Ulang Gembok HP Karyawan (Unbind)"
                              >
                                Reset Gembok HP
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingProfile({
                                  id: p.id,
                                  pin_mesin: p.pin_mesin,
                                  nama_lengkap: p.nama_lengkap,
                                  jabatan: p.jabatan,
                                  departemen: p.departemen,
                                  gaji_pokok: p.gaji_pokok,
                                  privilege_mesin: p.privilege_mesin,
                                  nip_nik: p.nip_nik || p.pin_mesin,
                                  role: p.role || (p.privilege_mesin === 3 ? "admin" : "employee"),
                                  status_kepegawaian: p.status_kepegawaian || "PNS",
                                  device_ip: p.device_ip || "",
                                  device_fingerprint: p.device_fingerprint || ""
                                });
                              }}
                              className="text-teal-600 hover:text-teal-800 font-semibold cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleProfileDelete(p.id)}
                              className="text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Exception Handling (Forget to Clock & Leaves input) */}
        {activeTab === "correction" && (
          <div className="max-w-xl bg-white border border-slate-200 p-6 rounded-2xl flex flex-col gap-4 text-left">
            <div>
              <h3 className="text-sm font-bold text-slate-800 leading-none">Forget to Clock (Koreksi Absen Manual)</h3>
              <p className="text-xs text-slate-400 mt-1">Gunakan formulir ini untuk mengisi log absensi jika karyawan bertugas dinas luar kota atau lupa menempel sidik jari di mesin.</p>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Karyawan Terkait</label>
                <select
                  required
                  value={correctionPin}
                  onChange={e => setCorrectionPin(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-slate-800 focus:outline-hidden"
                >
                  <option value="">-- Pilih Karyawan --</option>
                  {data.profiles.map(p => (
                    <option key={p.id} value={p.pin_mesin}>
                      [{p.pin_mesin}] {p.nama_lengkap} ({p.jabatan})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Tanggal Absensi</label>
                  <input
                    type="date"
                    required
                    value={correctionDate}
                    onChange={e => setCorrectionDate(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-slate-800 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jam Dipatenkan (HH:MM)</label>
                  <input
                    type="time"
                    required
                    value={correctionTime}
                    onChange={e => setCorrectionTime(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-slate-800 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kalkulasi Status / Alasan Kehadiran</label>
                  <select
                    value={correctionStatus}
                    onChange={e => setCorrectionStatus(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Tepat Waktu">Tepat Waktu (Hadir)</option>
                    <option value="Terlambat">Terlambat</option>
                    <option value="Pulang Cepat">Pulang Cepat</option>
                    <option value="Izin">Izin (Permasalahan Pribadi)</option>
                    <option value="Sakit">Sakit (Saran Dokter / Medis)</option>
                    <option value="Cuti">Cuti (Tahunan / Bersalin)</option>
                    <option value="Fakultatif">Fakultatif (Libur Khusus/Agama)</option>
                    <option value="Tanpa Keterangan">Tanpa Keterangan (Alpa Mangkir)</option>
                    <option value="Tugas Dinas">Tugas Dinas (Dinas Luar Kantor)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Alasan Penjelas (Leave/Correction)</label>
                  <input
                    type="text"
                    required
                    value={correctionNotes}
                    onChange={e => setCorrectionNotes(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-slate-800 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs text-center cursor-pointer uppercase transition-colors"
              >
                Koreksi Manual Sekarang
              </button>
            </form>
          </div>
        )}

        {/* TAB 6: Attendance Reports, Detailed raw logs and export XLSX */}
        {activeTab === "reports" && (
          <div className="flex flex-col gap-6">

            {/* Alat Penarikan & Filter Laporan Bulanan */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Penarikan & Filter Laporan Bulanan
                </h4>
                <p className="text-[11px] text-slate-400">Pilih periode di bawah ini untuk mengunduh log presensi serta rekapitulasi hitungan gaji THP bulanan.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-3xs w-full sm:w-auto">
                  <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap">Periode:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer p-0"
                  >
                    <option value="2026-06">Juni 2026 (Aktif)</option>
                    <option value="2026-05">Mei 2026</option>
                    <option value="2026-04">April 2026</option>
                    <option value="2026-07">Juli 2026</option>
                  </select>
                </div>
                
                <button
                  type="button"
                  onClick={async () => {
                    setIsPullingMonthly(true);
                    try {
                      const res = await onTriggerCalculate();
                      await onRefresh();
                      triggerNotification(
                        "success", 
                        `Sukses menarik, mengompilasi, dan mensinkronisasikan data kehadiran bulanan pegawai untuk periode ${
                          selectedMonth === "2026-06" ? "Juni 2026" : 
                          selectedMonth === "2026-05" ? "Mei 2026" : 
                          selectedMonth === "2026-04" ? "April 2026" : "Juli 2026"
                        } dari ADMS Mesin!`
                      );
                    } catch (e) {
                      triggerNotification("error", "Gagal melakukan kalkulasi rekapitulasi bulanan otomatis pada pangkalan data.");
                    } finally {
                      setTimeout(() => setIsPullingMonthly(false), 800);
                    }
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-3xs transition-all active:scale-95 cursor-pointer uppercase tracking-wider w-full sm:w-auto text-center"
                  disabled={isPullingMonthly}
                >
                  {isPullingMonthly ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Menarik...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tarik Data Bulanan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Reports list */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">Detailed Attendance logs (Laporan Gabungan Solusi X601 & Swafoto HP) - Periode {selectedMonth}</h3>
                <p className="text-xs text-slate-400">Total data mentah log masuk dan pulang terdaftar.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExportExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-slate-950" /> Download Lap. Excel (.xlsx)
                </button>
                <button
                  onClick={async () => {
                    setIsRefreshing(true);
                    try {
                      await onRefresh();
                      triggerNotification("success", "Log absensi dan status mesin ADMS berhasil disegarkan hasil mutakhir!");
                    } catch (err) {
                      triggerNotification("error", "Gagal menyegarkan data log dari ADMS Cloud.");
                    } finally {
                      setTimeout(() => setIsRefreshing(false), 800);
                    }
                  }}
                  className="p-2 border border-slate-300 bg-white hover:bg-slate-50 rounded-xl text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
                  disabled={isRefreshing}
                  title="Reload Logs"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
                </button>
              </div>
            </div>

            {/* Detailed logs list table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <th className="p-3">No</th>
                      <th className="p-3">Nama Karyawan</th>
                      <th className="p-3">PIN / ID</th>
                      <th className="p-3">Shift Kerja Kerja</th>
                      <th className="p-3">Tanggal Absen</th>
                      <th className="p-3">Waktu Scan</th>
                      <th className="p-3">Metode Pendeteksian</th>
                      <th className="p-3 text-center">Foto Selfie HP Verification</th>
                      <th className="p-3 text-center">Geofence</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Kalkulasi Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-400 italic">
                          Belum ada log terekam untuk periode {selectedMonth}. Silakan simulasikan absensi di ponsel karyawan pada menu "Mandiri HP".
                        </td>
                      </tr>
                    ) : (
                      filteredLogs
                        .sort((a,b) => new Date(b.waktu_scan).getTime() - new Date(a.waktu_scan).getTime())
                        .map((la, index) => {
                          const emp = data.profiles.find(p => p.pin_mesin === la.pin_mesin);
                          const dateObj = new Date(la.waktu_scan);
                          const showDate = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
                          const showTime = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

                          // Hitung/ambil data shift ditiap tanggal absen
                          const dateStr = la.waktu_scan.split("T")[0];
                          const schedule = data.jadwal_karyawan?.find(jk => jk.karyawan_id === emp?.id && jk.tanggal === dateStr);
                          let shiftInfo = "Biasa (Default)";
                          if (schedule) {
                            const s = data.shifts.find(sh => sh.id === schedule.shift_id);
                            if (s) shiftInfo = s.nama_shift;
                          } else if (emp && (
                            emp.jabatan?.toLowerCase().includes("ugd") || 
                            emp.jabatan?.toLowerCase().includes("igd") || 
                            emp.jabatan?.toLowerCase().includes("kia") || 
                            emp.jabatan?.toLowerCase().includes("bidan") || 
                            emp.jabatan?.toLowerCase().includes("perawat")
                          )) {
                            // Deteksi shift dinas otomatis berdasarkan kecocokan scan jam masuk terdekat
                            const inTimeStr = dateObj.toTimeString().split(" ")[0];
                            let minDiff = Infinity;
                            let selectedShift = data.shifts[0];
                            data.shifts.forEach(s => {
                              const [h1, m1] = inTimeStr.split(":").map(Number);
                              const [h2, m2] = s.jam_masuk.split(":").map(Number);
                              const diff = Math.abs((h1 * 60 + m1) - (h2 * 60 + m2));
                              if (diff < minDiff) {
                                minDiff = diff;
                                selectedShift = s;
                              }
                            });
                            if (selectedShift) {
                              shiftInfo = `⚡ Auto: ${selectedShift.nama_shift}`;
                            }
                          }

                          return (
                            <tr key={la.id} className="border-b border-slate-100 hover:bg-slate-50 text-slate-700">
                              <td className="p-3 font-mono">{index + 1}</td>
                              <td className="p-3 font-bold text-slate-900">{emp ? emp.nama_lengkap : `PIN ${la.pin_mesin}`}</td>
                              <td className="p-3 font-mono">{la.pin_mesin}</td>
                              <td className="p-3 font-semibold text-slate-800 text-[11px]">{shiftInfo}</td>
                              <td className="p-3 font-medium">{showDate}</td>
                              <td className="p-3 font-mono text-emerald-600 font-bold">{showTime} WITA</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  la.metode === "Mesin" 
                                    ? "bg-slate-100 text-slate-700" 
                                    : la.metode === "HP_Radius" 
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                                    : la.metode === "Tugas_Dinas"
                                    ? "bg-blue-100 text-blue-900 border border-blue-300 font-extrabold"
                                    : "bg-orange-50 text-orange-900 border border-orange-200"
                                }`}>
                                  {la.metode === "Tugas_Dinas" ? "💼 Tugas Dinas" : la.metode} {la.is_koreksi_manual && "(Koreksi)"}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                {la.foto_selfie_url ? (
                                  <div className="flex justify-center">
                                    <img 
                                      src={la.foto_selfie_url} 
                                      alt="Selfie thumbnail" 
                                      className="w-10 h-10 object-cover rounded border border-slate-300 shrink-0" 
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-slate-400 font-mono italic text-[10px]">ADMS Machine (Sidik Jari)</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {la.koordinat ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedMapLog(la)}
                                    title="Klik untuk melacak lokasi di peta satelit"
                                    className="inline-flex hover:underline hover:text-orange-500 items-center justify-center gap-1 text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 py-1 px-2 rounded-lg cursor-pointer font-mono text-[9px] transition-all font-semibold"
                                  >
                                    <MapPin className="w-3.5 h-3.5 text-orange-600 animate-pulse shrink-0" />
                                    <span>{la.koordinat}</span>
                                  </button>
                                ) : (
                                  <span className="text-slate-400 italic">No GPS (Mesin X601)</span>
                                )}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] whitespace-nowrap leading-none ${
                                  la.status_kehadiran === "Tepat Waktu"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : la.status_kehadiran === "Tugas Dinas"
                                    ? "bg-blue-100 text-blue-800 border border-blue-205"
                                    : la.status_kehadiran === "Terlambat"
                                    ? "bg-amber-100 text-amber-800 animate-pulse"
                                    : la.status_kehadiran === "Pulang Cepat"
                                    ? "bg-indigo-100 text-indigo-850"
                                    : la.status_kehadiran === "Izin"
                                    ? "bg-amber-50 text-amber-900 border border-amber-200"
                                    : la.status_kehadiran === "Sakit"
                                    ? "bg-rose-50 text-rose-900 border border-rose-200"
                                    : la.status_kehadiran === "Cuti"
                                    ? "bg-purple-50 text-purple-900 border border-purple-200"
                                    : la.status_kehadiran === "Fakultatif"
                                    ? "bg-teal-50 text-teal-900 border border-teal-200"
                                    : la.status_kehadiran === "Tanpa Keterangan"
                                    ? "bg-red-100 text-red-900 font-extrabold border border-red-300"
                                    : "bg-red-100 text-red-850"
                                }`}>
                                  {la.status_kehadiran === "Tanpa Keterangan" ? "Alpa Mangkir" : la.status_kehadiran}
                                </span>
                              </td>
                              <td className="p-3 font-medium text-slate-600">{la.keterangan_kalkulasi}</td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recap Table */}
            <div className="mt-4">
              <h3 className="text-sm font-bold text-slate-900 leading-tight mb-2">Rekapitulasi Kehadiran Bulanan (Format laporan.csv asli) - Periode {selectedMonth}</h3>
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold text-[11px]">
                        <th className="p-3">PIN</th>
                        <th className="p-3">Nama Karyawan</th>
                        <th className="p-3">Bulan</th>
                        <th className="p-3 text-center">Hari Kerja</th>
                        <th className="p-3 text-center text-emerald-400">Hadir</th>
                        <th className="p-3 text-center text-amber-300">Late (Min)</th>
                        <th className="p-3 text-center text-indigo-300">Early (Min)</th>
                        <th className="p-3 text-center text-emerald-300">Overtime</th>
                        <th className="p-3 text-center text-orange-300">Izin</th>
                        <th className="p-3 text-center text-rose-300">Sakit</th>
                        <th className="p-3 text-center text-purple-300">Cuti</th>
                        <th className="p-3 text-center text-teal-300">Fakultatif</th>
                        <th className="p-3 text-center text-blue-300">Tgas Dinas</th>
                        <th className="p-3 text-center text-red-400">Alpa (Unexcused)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRekap.length === 0 ? (
                        <tr>
                          <td colSpan={16} className="p-8 text-center text-slate-400 italic">
                            Tidak ada rekapitulasi bulanan pada bulan {selectedMonth}. Klik tombol "Tarik Data Bulanan" di atas untuk membuat rekapitulasi data otomatis.
                          </td>
                        </tr>
                      ) : (
                        filteredRekap.map(r => {
                          const emp = data.profiles.find(p => p.pin_mesin === r.pin_mesin);
                          return (
                            <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 text-slate-700 font-semibold text-[11px]">
                              <td className="p-3 font-mono font-bold text-slate-800">{r.pin_mesin}</td>
                              <td className="p-3 text-slate-900 font-bold">{emp ? emp.nama_lengkap : "Unknown"}</td>
                              <td className="p-3 font-mono text-slate-500">{r.bulan_tahun}</td>
                              <td className="p-3 text-center font-bold text-slate-500">{r.hari_normal_kerja}</td>
                              <td className="p-3 text-center text-emerald-600 font-bold">{r.jml_kehadiran} hari</td>
                              <td className="p-3 text-center font-mono text-amber-600 font-bold">{r.total_terlambat_menit}m</td>
                              <td className="p-3 text-center font-mono text-indigo-500 font-bold">{r.total_pulang_cepat_menit}m</td>
                              <td className="p-3 text-center font-mono text-emerald-600 font-bold">{r.total_lembur_menit}m</td>
                              <td className="p-3 text-center font-mono text-orange-600 font-bold">{r.total_izin || 0}d</td>
                              <td className="p-3 text-center font-mono text-rose-600 font-bold">{r.total_sakit || 0}d</td>
                              <td className="p-3 text-center font-mono text-purple-600 font-bold">{r.total_cuti || 0}d</td>
                              <td className="p-3 text-center font-mono text-teal-600 font-bold">{r.total_fakultatif || 0}d</td>
                              <td className="p-3 text-center font-mono text-blue-600 font-bold">{r.total_tugas_dinas || 0}d</td>
                              <td className="p-3 text-center font-mono text-red-505 font-bold">
                                {r.total_absent + (r.total_tanpa_keterangan || 0)} d
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 8: ADMS Command queue logs console and active emulation of physical machine */}
        {activeTab === "hardware" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Interactive Sync & Pull Manager */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              <div className="bg-white border text-left border-slate-205 p-5 rounded-3xl shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-slate-900 rounded-xl">
                    <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" style={{ animationDuration: "12s" }} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 leading-none">Sinkronisasi & Tarik Data Mesin</h3>
                    <h4 className="text-base font-black text-slate-900 mt-1">Solution X601 Terminal Manager</h4>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-700 leading-relaxed mb-4">
                  <div className="font-bold text-slate-800 mb-1.5 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                    <Database className="w-3.5 h-3.5 text-slate-500" /> Spesifikasi Penarikan Data (Solution X601):
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-650 ml-1">
                    <li><strong className="text-slate-800">Absensi (Scan Log):</strong> Tarik seluruh riwayat masuk-pulang mentah dari penyimpanan flash internal mesin.</li>
                    <li><strong className="text-slate-800">Karyawan (Fingerprint & Face):</strong> Daftarkan otomatis staff baru dari backup sidik jari terminal Solution X601.</li>
                    <li><strong className="text-slate-800">Departemen:</strong> Tarik struktur departemen dinas/poli yang dipetakan pada mesin (Poli Umum, UGD, Farmasi, dll).</li>
                    <li><strong className="text-slate-800">Jadwal & Shift Kerja:</strong> Singkronkan pengaturan shift dinas bergilir dan plotting jadwal harian.</li>
                    <li><strong className="text-slate-800">Aturan Presensi:</strong> Align aturan denda keterlambatan/mangkir dan jam toleransi (10 m) ke web app.</li>
                  </ul>
                </div>

                <div className="flex flex-wrap gap-4 items-center justify-between border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Status Mesin Terkoneksi:</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      Ready - ADMS TCP/IP Live Push (Port 3000)
                    </span>
                  </div>

                  <button
                    onClick={handlePullSolutionX601}
                    disabled={isPulling}
                    className="bg-slate-900 hover:bg-slate-850 disabled:bg-slate-400 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isPulling ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menghubungkan Terminal...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span className="uppercase tracking-wider">TARIK DATA SOLUTION X601</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Display Results */}
                {pullResult && (
                  <div className="mt-4 bg-emerald-50 border border-emerald-250 p-4 rounded-xl text-xs text-emerald-900 flex flex-col gap-2">
                    <div className="font-bold flex items-center gap-1 text-[11px] text-emerald-800 uppercase tracking-widest">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> SINKRONISASI SUKSES (DATABANK UPDATE)
                    </div>
                    <p className="font-semibold text-emerald-705 leading-snug">
                      Mesin Absen Solution X601 (IP: 192.168.1.201) berhasil di-query dan data berhasil di-merge ke sistem:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                      <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-100 shadow-xxs">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Karyawan Baru</span>
                        <strong className="text-slate-800 text-xs text-emerald-700 block mt-0.5">
                          {pullResult.karyawan.length > 0 ? `${pullResult.karyawan.length} Staff Pulled` : "Sesuai (0 Baru)"}
                        </strong>
                        {pullResult.karyawan.length > 0 && <span className="text-[9px] block text-teal-650 leading-tight mt-0.5">{pullResult.karyawan.join(", ")}</span>}
                      </div>

                      <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-100 shadow-xxs">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Log Absensi</span>
                        <strong className="text-slate-800 text-xs text-emerald-700 block mt-0.5">{pullResult.absensi} Log Transaksi</strong>
                        <span className="text-[9px] block text-emerald-600 font-medium">Sync ke DB Absensi</span>
                      </div>

                      <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-100 shadow-xxs">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Departemen</span>
                        <strong className="text-slate-800 text-xs text-emerald-700 block mt-0.5">{pullResult.departments.length} Poli/Divisi</strong>
                        <span className="text-[9px] block text-slate-500 truncate" title={pullResult.departments.join(", ")}>{pullResult.departments.slice(0, 3).join(", ")}...</span>
                      </div>

                      <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-100 shadow-xxs">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Plot Jadwal</span>
                        <strong className="text-slate-800 text-xs text-emerald-700 block mt-0.5">{pullResult.jadwal} Tanggal Shift</strong>
                        <span className="text-[9px] text-emerald-600 font-medium block">Roster Updated</span>
                      </div>

                      <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-100 shadow-xxs">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Jam Kerja & Shift</span>
                        <strong className="text-slate-800 text-xs text-emerald-700 block mt-0.5">
                          {pullResult.shifts.length > 0 ? `${pullResult.shifts.length} Shift Baru` : "Terupdate"}
                        </strong>
                        {pullResult.shifts.length > 0 && <span className="text-[9px] text-indigo-500 block">{pullResult.shifts.join(", ")}</span>}
                      </div>

                      <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-100 shadow-xxs">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Kebijakan Presensi</span>
                        <strong className="text-slate-800 text-xs leading-none block mt-0.5">Toleransi {pullResult.aturan.split(" ")[2]} m</strong>
                        <span className="text-[9px] text-slate-500 block leading-tight mt-0.5">Config Denda Disinkronkan</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Command history queue list */}
              <div className="bg-slate-950 text-emerald-400 p-5 rounded-3xl font-mono text-[11px] h-fit">
                <div className="flex justify-between items-center text-xs tracking-wider font-bold mb-3 border-b border-emerald-950 pb-2 text-white">
                  <span className="flex items-center gap-1"><Server className="w-4 h-4 text-emerald-500" /> Solution X601 (ADMS Command Pool)</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-semibold">Active Push Protocol</span>
                </div>

                <div className="flex flex-col gap-1 max-h-80 overflow-y-auto mb-4 custom-scrollbar leading-relaxed">
                  <p className="text-slate-500">[SYSTEM] Listening for ADMS GET poll /iclock/getrequest...</p>
                  {data.adms_commands.slice().reverse().map(cmd => (
                    <div key={cmd.id} className="border-b border-emerald-950/40 pb-1.5 pt-1.5 flex flex-col gap-0.5 bg-black/10 px-2 rounded">
                      <div className="flex justify-between font-bold">
                        <span className="text-white">CMD #{cmd.id} (PIN {cmd.pin_mesin})</span>
                        <span className={`px-1.5 rounded text-[9px] ${
                          cmd.status === "Sukses"
                            ? "bg-emerald-955 text-emerald-300 border border-emerald-800"
                            : cmd.status === "Antri"
                            ? "bg-amber-955 text-amber-300 border border-amber-800"
                            : cmd.status === "Terkirim"
                            ? "bg-blue-955 text-blue-300 border border-blue-900"
                            : "bg-red-955 text-red-300 border border-red-800"
                        }`}>{cmd.status}</span>
                      </div>
                      <div className="text-slate-400 mt-1 whitespace-pre-wrap select-all font-mono font-medium text-[10px]">
                        {cmd.command_text}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        Updated: {new Date(cmd.updated_at).toLocaleTimeString("id-ID")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* API Endpoints Info */}
                <div className="border-t border-emerald-950/60 pt-3 text-[10px] text-slate-400 flex flex-col gap-1 leading-normal font-sans">
                  <span className="font-bold text-white tracking-wider uppercase mb-1 font-mono">📡 Endpoints Terintegrasi ADMS:</span>
                  <div><span className="text-orange-400 font-mono">GET /iclock/getrequest</span> - Mengambil antrean perintah 'Antri'.</div>
                  <div><span className="text-orange-400 font-mono">POST /iclock/devicecmd</span> - Menerima konfirmasi eksekusi dari mesin.</div>
                  <div><span className="text-orange-400 font-mono">POST /api/adms/pull</span> - Sync database massal dari terminal Solution X601.</div>
                </div>
              </div>
            </div>

            {/* Simulated interactive physical Solution X601 Machine on screen */}
            <div className="bg-slate-300 border-4 border-slate-400 p-4 rounded-3xl max-w-xs shadow-inner flex flex-col gap-4 text-left font-sans text-slate-800 relative">
              {/* Machine Speaker & screen */}
              <div>
                <div className="text-slate-600 font-bold text-[9px] text-center mb-1 uppercase tracking-wide">Solution X601 ZKTeco Emulator</div>
                <div className="bg-slate-900 text-teal-400 p-3 rounded-lg font-mono text-[11px] border border-slate-800 text-center flex flex-col gap-1 min-h-32 justify-center items-center">
                  <Fingerprint className="w-8 h-8 text-teal-400 animate-pulse mb-1" />
                  <div className="font-bold leading-tight">SILAKAN TEMPELKAN<br />SIDIK JARI ANDA</div>
                  <div className="text-[9px] text-white/50">{new Date().toLocaleDateString("id", { weekday: 'long', day: 'numeric', month: 'short' })}</div>
                </div>
              </div>

              <div className="bg-slate-200 border border-slate-350 p-3 rounded-xl flex flex-col gap-2.5 text-xs">
                <span className="font-bold text-slate-700 text-[10px] uppercase block tracking-wider text-center">🎯 SIMULATOR TAP MESIN FISIK</span>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Karyawan yang Menempelkan:</label>
                  <select
                    value={emulatedMachinePin}
                    onChange={e => setEmulatedMachinePin(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-400 rounded bg-white py-1 px-1.5 focus:outline-hidden"
                  >
                    {data.profiles.map(p => (
                      <option key={p.id} value={p.pin_mesin}>
                        [{p.pin_mesin}] {p.nama_lengkap}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Jam Tempel:</label>
                    <input
                      type="time"
                      value={emulatedLogTime}
                      onChange={e => setEmulatedLogTime(e.target.value)}
                      className="w-full text-xs font-mono border border-slate-400 rounded bg-white py-0.5 px-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Metode:</label>
                    <select
                      value={emulatedIsCheckIn ? "in" : "out"}
                      onChange={e => setEmulatedIsCheckIn(e.target.value === "in")}
                      className="w-full text-xs border border-slate-400 rounded bg-white py-0.5 px-1 focus:outline-hidden"
                    >
                      <option value="in">Check-In</option>
                      <option value="out">Check-Out</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleHardwareEmulationSubmit}
                  className="w-full bg-slate-800 hover:bg-slate-950 text-white font-bold py-2 rounded text-xs cursor-pointer tracking-wider transition-colors border-b-4 border-slate-900"
                >
                  TEMPEL JARI (KIRIM RAW)
                </button>
              </div>

              {/* Keypad simulation */}
              <div className="grid grid-cols-4 gap-1 select-none">
                {["1", "2", "3", "M/OK", "4", "5", "6", "ESC", "7", "8", "9", "▲", "C", "0", "◀", "▼"].map((key, i) => (
                  <div 
                    key={i} 
                    className="bg-slate-700 text-slate-200 text-center font-bold text-[10px] py-1.5 rounded border border-slate-600 shadow-sm cursor-pointer hover:bg-slate-800 active:scale-95"
                  >
                    {key}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Modal overlay for viewing employee Map position in high resolution detail */}
      {selectedMapLog && (() => {
        const isPrivacyShielded = !selectedMapLog.koordinat || selectedMapLog.koordinat.includes("Proteksi") || !selectedMapLog.koordinat.includes(",");
        const coords = !isPrivacyShielded && selectedMapLog.koordinat ? selectedMapLog.koordinat.split(",") : [];
        const userLat = coords.length > 0 ? parseFloat(coords[0]) || 0 : 0;
        const userLng = coords.length > 1 ? parseFloat(coords[1]) || 0 : 0;
        const centerLat = data.rules?.geofence_latitude ?? -0.8986;
        const centerLng = data.rules?.geofence_longitude ?? 108.9711;
        const radiusMeter = data.rules?.geofence_radius_meter ?? 100;
        
        // Compute real Haversine distance
        const R = 6371e3; // metres
        const φ1 = userLat * Math.PI / 180;
        const φ2 = centerLat * Math.PI / 180;
        const Δφ = (centerLat - userLat) * Math.PI / 180;
        const Δλ = (centerLng - userLng) * Math.PI / 180;
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const computedDistance = isPrivacyShielded ? 0 : Math.round(R * c);
        const isWithinRadius = isPrivacyShielded ? true : computedDistance <= radiusMeter;
        
        const emp = data.profiles.find(p => p.pin_mesin === selectedMapLog.pin_mesin);
        
        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all overflow-y-auto">
            <div className="bg-slate-900 border border-slate-850 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col text-white my-8">
              
              {/* Header */}
              <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-600/10 rounded-lg border border-orange-500/20 text-orange-500">
                    <MapPin className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-wide uppercase text-slate-100">Tracking GPS & Lokasi Absensi Karyawan</h3>
                    <p className="text-[10px] text-slate-400">Verifikasi posisi presensi seluler terhadap peta area puskesmas.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedMapLog(null)}
                  className="text-slate-400 hover:text-white transition-colors bg-white/5 w-7 h-7 rounded-full flex items-center justify-center font-bold font-sans cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto flex flex-col md:flex-row gap-5">
                
                {/* Details side */}
                <div className="flex-1 flex flex-col gap-3 min-w-[200px]">
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-850">
                    <span className="block text-[8px] font-black uppercase text-teal-400 tracking-wider">Nama Karyawan</span>
                    <span className="text-xs font-black text-white">{emp ? emp.nama_lengkap : `PIN ${selectedMapLog.pin_mesin}`}</span>
                    <span className="block text-[8px] text-slate-400 font-mono mt-0.5">PIN: {selectedMapLog.pin_mesin} • NIP: {emp?.nip_nik || "-"}</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-850">
                    <span className="block text-[8px] font-black uppercase text-teal-400 tracking-wider">Metode & Waktu Scan</span>
                    <span className="text-xs font-bold text-white block">{selectedMapLog.metode}</span>
                    <span className="text-[9px] text-slate-400 block font-mono">{new Date(selectedMapLog.waktu_scan).toLocaleString("id-ID")} WITA</span>
                  </div>

                  {selectedMapLog.foto_selfie_url ? (
                    <div className="flex flex-col gap-1 w-full mt-2">
                      <span className="text-[9px] font-bold text-slate-400">Verifikasi Swafoto Karyawan:</span>
                      <div className="relative rounded-xl overflow-hidden border border-slate-800 aspect-square w-full h-36 bg-slate-950">
                        <img 
                          src={selectedMapLog.foto_selfie_url} 
                          alt="Selfie verification" 
                          className="object-cover w-full h-full"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-950 rounded-2xl p-4 border border-dashed border-slate-850 text-center text-[10px] text-slate-500 italic mt-2">
                      Tidak ada foto swafoto (Absen di luar HP)
                    </div>
                  )}
                </div>

                {/* Map side */}
                <div className="flex-1 min-w-[280px]">
                  {isPrivacyShielded ? (
                    <div className="bg-slate-950 rounded-3xl p-6 border border-amber-500/20 text-center flex flex-col items-center justify-center gap-3 h-full min-h-[250px]">
                      <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 border border-amber-500/35">
                        <ShieldAlert className="w-6 h-6 animate-pulse" />
                      </div>
                      <h4 className="text-xs font-black uppercase text-amber-500 tracking-wider">Proteksi Privasi Aktif (Sudah Pulang)</h4>
                      <p className="text-[10px] text-slate-300 leading-relaxed max-w-xs font-semibold">
                        Sesuai konfigurasi sistem, titik lokasi GPS karyawan **tidak dapat dilacak setelah melakukan Absen Pulang (Check-Out)** demi mendukung perlindungan privasi perangkat personal di luar jam kerja.
                      </p>
                      <div className="bg-slate-900 border border-slate-850 p-2 rounded-lg text-[9px] font-mono mt-1 text-slate-400 w-full">
                        Masing-masing data rincian koordinat:<br/>
                        <span className="text-amber-500 font-bold break-all">{selectedMapLog.koordinat}</span>
                      </div>
                    </div>
                  ) : (
                    <GeofenceMap
                      centerLat={centerLat}
                      centerLng={centerLng}
                      userLat={userLat}
                      userLng={userLng}
                      radiusMeter={radiusMeter}
                      distance={computedDistance}
                      isWithinRadius={isWithinRadius}
                      username={emp?.nama_lengkap || "Karyawan"}
                    />
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-950 p-3 border-t border-slate-800 flex justify-end gap-2 text-xs shrink-0">
                <button 
                  onClick={() => setSelectedMapLog(null)}
                  className="bg-teal-600 hover:bg-teal-500 text-slate-950 font-black px-5 py-2 rounded-2xl transition-all cursor-pointer uppercase tracking-wider"
                >
                  Tutup Peta Tracking
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Custom Confirmation Modal for Safe, Secure Actions */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="text-amber-500 flex items-center gap-2 mb-3">
              <span className="shrink-0 text-amber-500">⚠️</span>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed mb-6">
              {confirmModal.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2 border border-slate-250 bg-slate-50 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-105 transition-colors cursor-pointer"
              >
                Tidak
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {confirmModal.confirmText || "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
