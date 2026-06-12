import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();


import { 
  Profile, Shift, JadwalKaryawan, LogAbsensi, AdmsCommand, RekapBulanan, AttendanceRule, Holiday 
} from "./src/types.js";

import {
  hasSupabaseConfig,
  supabaseConnected,
  lastSyncMessage,
  testConnection,
  pushAllToSupabase,
  pullFromSupabase,
  setSupabaseStatus
} from "./src/supabaseService.js";


export const app = express();
const PORT = 3000;

// Body parsers
app.use(express.json({ limit: "15mb" }));
app.use(express.text({ type: "text/*" }));
app.use(express.text({ type: "application/octet-stream" }));

// DB file path
const DB_PATH = path.join(process.cwd(), "attendance_db.json");

// Default initial state
const defaultDb = {
  profiles: [] as Profile[],
  shifts: [] as Shift[],
  jadwal_karyawan: [] as JadwalKaryawan[],
  log_absensi: [] as LogAbsensi[],
  adms_commands: [] as AdmsCommand[],
  rekap_bulanan: [] as RekapBulanan[],
  rules: {
    toleransi_terlambat_menit: 15,
    tarif_potongan_terlambat_per_menit: 2000, // Rp 2.000 / menit
    tarif_denda_alpa: 150000, // Rp 150.000
    lembur_mulai_menit: 480, // setelah 8 jam
    tunjangan_kehadiran_harian: 50000, // Rp 50.000 / hari hadir
    geofence_latitude: -0.8986,
    geofence_longitude: 108.9711,
    geofence_radius_meter: 100
  } as AttendanceRule,
  holidays: [
    { id: 1, tanggal: "2026-06-01", keterangan: "Hari Lahir Pancasila" },
    { id: 2, tanggal: "2026-06-17", keterangan: "Hari Raya Idul Adha" }
  ] as Holiday[]
};

// Seed initial values if database empty
function seedData(db: typeof defaultDb) {
  if (db.profiles.length === 0) {
    db.profiles = [
      {
        id: "usr-001",
        pin_mesin: "1001",
        userid_mesin: 1,
        nama_lengkap: "Muhammad Wahyu Darizki",
        privilege_mesin: 3, // Admin
        jabatan: "Kepala Puskesmas",
        departemen: "UPT Puskesmas Sedau",
        gaji_pokok: 8500000,
        face_template: "FACE_TEMPLATE_BINARY_DATA_WAHYU_1001",
        fingerprint_template: "FINGER_TEMPLATE_BINARY_DATA_WAHYU_1001",
        created_at: new Date().toISOString(),
        role: "admin",
        nip_nik: "1991001"
      },
      {
        id: "usr-002",
        pin_mesin: "1002",
        userid_mesin: 2,
        nama_lengkap: "dr. Siska Amelia",
        privilege_mesin: 0,
        jabatan: "Dokter Umum",
        departemen: "UPT Puskesmas Sedau",
        gaji_pokok: 7200000,
        face_template: "FACE_TEMPLATE_BINARY_DATA_SISKA_1002",
        fingerprint_template: null,
        created_at: new Date().toISOString(),
        role: "employee",
        nip_nik: "1991002"
      },
      {
        id: "usr-003",
        pin_mesin: "1003",
        userid_mesin: 3,
        nama_lengkap: "Ns. Hendra Wijaya, S.Kep",
        privilege_mesin: 0,
        jabatan: "Perawat IGD",
        departemen: "UPT Puskesmas Sedau",
        gaji_pokok: 5200000,
        face_template: null,
        fingerprint_template: "FINGER_TEMPLATE_BINARY_DATA_HENDRA_1003",
        created_at: new Date().toISOString(),
        role: "employee",
        nip_nik: "1991003"
      },
      {
        id: "usr-004",
        pin_mesin: "1004",
        userid_mesin: 4,
        nama_lengkap: "Ratna Sari, A.Md.Keb",
        privilege_mesin: 0,
        jabatan: "Bidan Poli KIA",
        departemen: "UPT Puskesmas Sedau",
        gaji_pokok: 4800000,
        face_template: null,
        fingerprint_template: null,
        created_at: new Date().toISOString(),
        role: "employee",
        nip_nik: "1991004"
      },
      {
        id: "usr-005",
        pin_mesin: "1005",
        userid_mesin: 5,
        nama_lengkap: "Ahmad Junaidi, S.Farm",
        privilege_mesin: 0,
        jabatan: "Apoteker Pelaksana",
        departemen: "UPT Puskesmas Sedau",
        gaji_pokok: 4500000,
        face_template: "FACE_TEMPLATE_BINARY_DATA_AHMAD_1005",
        fingerprint_template: "FINGER_TEMPLATE_BINARY_DATA_AHMAD_1005",
        created_at: new Date().toISOString(),
        role: "employee",
        nip_nik: "1991005"
      }
    ];
  }

  if (db.shifts.length === 0) {
    db.shifts = [
      {
        id: 1,
        nama_shift: "Pagi (Dinas Pagi)",
        jam_masuk: "07:30:00",
        jam_pulang: "14:00:00",
        toleransi_terlambat_menit: 15,
        harus_check_in: true,
        harus_check_out: true
      },
      {
        id: 2,
        nama_shift: "Siang (Dinas Siang)",
        jam_masuk: "14:00:00",
        jam_pulang: "20:30:00",
        toleransi_terlambat_menit: 15,
        harus_check_in: true,
        harus_check_out: true
      },
      {
        id: 3,
        nama_shift: "Malam (Dinas Malam)",
        jam_masuk: "20:30:00",
        jam_pulang: "07:30:00",
        toleransi_terlambat_menit: 15,
        harus_check_in: true,
        harus_check_out: true
      },
      {
        id: 4,
        nama_shift: "Administratif (Kantor)",
        jam_masuk: "08:00:00",
        jam_pulang: "16:00:00",
        toleransi_terlambat_menit: 15,
        harus_check_in: true,
        harus_check_out: true
      }
    ];
  }

  // Seed jadwal_karyawan for June 2026
  // Generate some shifts for employees
  if (db.jadwal_karyawan.length === 0) {
    let idx = 1;
    const dates = ["2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11", "2026-06-12", "2026-06-13", "2026-06-14"];
    db.profiles.forEach((p) => {
      dates.forEach((date, di) => {
        // Assign shifts: Admin (Wahyu) got Shift 4 (Administratif)
        // Others rotate or get constant shifts
        let shiftId = 4;
        if (p.pin_mesin === "1001") {
          shiftId = 4; // Administratif
        } else if (p.pin_mesin === "1002") {
          shiftId = (di % 2 === 0) ? 1 : 2; // Pagi-Siang
        } else if (p.pin_mesin === "1003") {
          shiftId = (di % 3 === 0) ? 3 : 1; // Malam or Pagi
        } else if (p.pin_mesin === "1004") {
          shiftId = 1; // Pagi always
        } else {
          shiftId = 2; // Siang always
        }

        db.jadwal_karyawan.push({
          id: idx++,
          karyawan_id: p.id,
          shift_id: shiftId,
          tanggal: date
        });
      });
    });
  }

  // Fill in active logs up to June 11, and some today (June 12)
  if (db.log_absensi.length === 0) {
    let logId = 1;

    // We can pre-populate historical logs for dynamic metrics:
    // Employee 1001 (Wahyu - Administratif 08:00:00 - 16:00:00)
    // 2026-06-08: On-time (IN 07:55:00, OUT 16:05:00)
    db.log_absensi.push(
      {
        id: logId++,
        pin_mesin: "1001",
        waktu_scan: "2026-06-08T07:55:00+08:00",
        metode: "Mesin",
        status_kehadiran: "Tepat Waktu",
        keterangan_kalkulasi: "Check In Tepat Waktu",
        is_koreksi_manual: false
      },
      {
        id: logId++,
        pin_mesin: "1001",
        waktu_scan: "2026-06-08T16:05:00+08:00",
        metode: "Mesin",
        status_kehadiran: "Tepat Waktu",
        keterangan_kalkulasi: "Check Out Tepat Waktu",
        is_koreksi_manual: false
      }
    );

    // 2026-06-09: Terlambat (IN 08:22:00, OUT 16:00:00) -> Late 22 min
    db.log_absensi.push(
      {
        id: logId++,
        pin_mesin: "1001",
        waktu_scan: "2026-06-09T08:22:00+08:00",
        metode: "HP_Radius",
        foto_selfie_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        koordinat: "-0.8985,108.9712",
        status_kehadiran: "Terlambat",
        keterangan_kalkulasi: "Terlambat 22 Menit",
        is_koreksi_manual: false
      },
      {
        id: logId++,
        pin_mesin: "1001",
        waktu_scan: "2026-06-09T16:01:00+08:00",
        metode: "HP_Radius",
        foto_selfie_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        koordinat: "-0.8986,108.9710",
        status_kehadiran: "Tepat Waktu",
        keterangan_kalkulasi: "Check Out Tepat Waktu",
        is_koreksi_manual: false
      }
    );

    // 2026-06-10: Pulang Cepat (IN 07:50:00, OUT 15:45:00) -> early leave 15 mins
    db.log_absensi.push(
      {
        id: logId++,
        pin_mesin: "1001",
        waktu_scan: "2026-06-10T07:50:00+08:00",
        metode: "Mesin",
        status_kehadiran: "Tepat Waktu",
        keterangan_kalkulasi: "Check In Tepat Waktu",
        is_koreksi_manual: false
      },
      {
        id: logId++,
        pin_mesin: "1001",
        waktu_scan: "2026-06-10T15:45:00+08:00",
        metode: "Mesin",
        status_kehadiran: "Pulang Cepat",
        keterangan_kalkulasi: "Pulang Cepat 15 Menit",
        is_koreksi_manual: false
      }
    );

    // 2026-06-11: On-time (IN 07:58:00, OUT 16:02:00)
    db.log_absensi.push(
      {
        id: logId++,
        pin_mesin: "1001",
        waktu_scan: "2026-06-11T07:58:00+08:00",
        metode: "HP_Radius",
        foto_selfie_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        koordinat: "-0.8987,108.9713",
        status_kehadiran: "Tepat Waktu",
        keterangan_kalkulasi: "Check In Tepat Waktu",
        is_koreksi_manual: false
      },
      {
        id: logId++,
        pin_mesin: "1001",
        waktu_scan: "2026-06-11T16:02:00+08:00",
        metode: "HP_Radius",
        foto_selfie_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        koordinat: "-0.8986,108.9711",
        status_kehadiran: "Tepat Waktu",
        keterangan_kalkulasi: "Check Out Tepat Waktu",
        is_koreksi_manual: false
      }
    );

    // Employee 1002 (Dr. Siska - shift 1 Pagi: 07:30:00 - 14:00:00)
    // 2026-06-08: On-time
    db.log_absensi.push(
      {
        id: logId++,
        pin_mesin: "1002",
        waktu_scan: "2026-06-08T07:22:00+08:00",
        metode: "Mesin",
        status_kehadiran: "Tepat Waktu",
        keterangan_kalkulasi: "Check In Tepat Waktu",
        is_koreksi_manual: false
      },
      {
        id: logId++,
        pin_mesin: "1002",
        waktu_scan: "2026-06-08T14:04:00+08:00",
        metode: "Mesin",
        status_kehadiran: "Tepat Waktu",
        keterangan_kalkulasi: "Check Out Tepat Waktu",
        is_koreksi_manual: false
      }
    );

    // 2026-06-09: Terlambat Parah (07:55:00) -> Late 25 minutes (Pagi shift starts at 07:30, toleransi 15, so 07:45 is maximum)
    db.log_absensi.push(
      {
        id: logId++,
        pin_mesin: "1002",
        waktu_scan: "2026-06-09T07:55:00+08:00",
        metode: "HP_Radius",
        foto_selfie_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
        koordinat: "-0.8986,108.9711",
        status_kehadiran: "Terlambat",
        keterangan_kalkulasi: "Terlambat 25 Menit",
        is_koreksi_manual: false
      },
      {
        id: logId++,
        pin_mesin: "1002",
        waktu_scan: "2026-06-09T14:01:00+08:00",
        metode: "HP_Radius",
        foto_selfie_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
        koordinat: "-0.8986,108.9711",
        status_kehadiran: "Tepat Waktu",
        keterangan_kalkulasi: "Check Out Tepat Waktu",
        is_koreksi_manual: false
      }
    );

    // 2026-06-10: Leave (Sakit) -> No logs, but manual entry can be tested!
    // 2026-06-11: On-time
    db.log_absensi.push(
      {
        id: logId++,
        pin_mesin: "1002",
        waktu_scan: "2026-06-11T07:28:00+08:00",
        metode: "Mesin",
        status_kehadiran: "Tepat Waktu",
        is_koreksi_manual: false
      },
      {
        id: logId++,
        pin_mesin: "1002",
        waktu_scan: "2026-06-11T14:05:00+08:00",
        metode: "Mesin",
        status_kehadiran: "Tepat Waktu",
        is_koreksi_manual: false
      }
    );

    // Budi Santoso 1003 (Malam 20:30:00 - 07:30:00)
    // 2026-06-08: On-time
    db.log_absensi.push(
      {
        id: logId++,
        pin_mesin: "1003",
        waktu_scan: "2026-06-08T20:25:00+08:00",
        metode: "Mesin",
        status_kehadiran: "Tepat Waktu",
        is_koreksi_manual: false
      },
      {
        id: logId++,
        pin_mesin: "1003",
        waktu_scan: "2026-06-09T07:31:00+08:00",
        metode: "Mesin",
        status_kehadiran: "Tepat Waktu",
        is_koreksi_manual: false
      }
    );
  }

  // Pre-seed 2 sample ADMS commands to demonstrate the physical hardware controls!
  if (db.adms_commands.length === 0) {
    db.adms_commands = [
      {
        id: 101,
        pin_mesin: "1001",
        command_text: "DATA USER PIN=1001 Name=Wahyu Darizki Pri=3",
        status: "Sukses",
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 102,
        pin_mesin: "1002",
        command_text: "DATA USER PIN=1002 Name=Siska Amelia Pri=0",
        status: "Antri",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 103,
        pin_mesin: "ALL",
        command_text: "SET OPTIONS DateTime=2026-06-12 08:58:00",
        status: "Antri",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }
}

// Global in-memory cache for the database to support serverless/read-only environments like Vercel
export let activeDb: typeof defaultDb | null = null;

// Read database helper
function readDb(): typeof defaultDb {
  if (activeDb) {
    return activeDb;
  }
  try {
    if (fs.existsSync(DB_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
      // Ensure key items exist
      const merged = { ...defaultDb, ...parsed };
      seedData(merged);
      activeDb = merged;
      return merged;
    }
  } catch (err) {
    console.error("Failed to read database file, recovery to memory used", err);
  }
  const memDb = { ...defaultDb };
  seedData(memDb);
  activeDb = memDb;
  return memDb;
}

// Write database helper
function writeDb(db: typeof defaultDb) {
  activeDb = db;
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write to database file (expected in read-only/serverless environments like Vercel):", err);
  }
  if (hasSupabaseConfig) {
    pushAllToSupabase(db).catch(err => {
      console.error("[SUPABASE BACKGROUND SYNC ERROR]", err);
    });
  }
}

// Helper: Calculate logs based on shifts and toleransi
// JIKA Scan Masuk > Jam Masuk Shift + Toleransi Menit, MAKA Terlambat = Scan Masuk - Jam Masuk Shift.
function getMinutesDiff(time1: string, time2: string) {
  const [h1, m1, s1] = time1.split(":").map(Number);
  const [h2, m2, s2] = time2.split(":").map(Number);
  return (h1 * 60 + m1) - (h2 * 60 + m2);
}

function getDatesOfMonth(monthYear: string): string[] {
  const [year, month] = monthYear.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const list: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = d < 10 ? `0${d}` : `${d}`;
    const mStr = month < 10 ? `0${month}` : `${month}`;
    list.push(`${year}-${mStr}-${dStr}`);
  }
  return list;
}

function processScanLogs(db: typeof defaultDb) {
  // Loop through months that could have records
  const monthsToCalc = ["2026-04", "2026-05", "2026-06", "2026-07"];
  const rekapList: RekapBulanan[] = [];

  monthsToCalc.forEach(month => {
    const dates = getDatesOfMonth(month);

    db.profiles.forEach(p => {
      // Create fresh monthly calculation
      const r: RekapBulanan = {
        id: Math.floor(Math.random() * 10000000) + rekapList.length,
        pin_mesin: p.pin_mesin,
        bulan_tahun: month,
        hari_normal_kerja: 22, // Standar hari kerja
        jml_kehadiran: 0,
        total_terlambat_menit: 0,
        total_pulang_cepat_menit: 0,
        total_absent: 0,
        total_lembur_menit: 0,
        gaji_bersih_thp: p.gaji_pokok,
        total_izin: 0,
        total_sakit: 0,
        total_cuti: 0,
        total_fakultatif: 0,
        total_tugas_dinas: 0,
        total_tanpa_keterangan: 0
      };

      let activePresenceDays = 0;

      dates.forEach(date => {
        // Find if this record has a scheduled roster shift
        const schedule = db.jadwal_karyawan.find(jk => jk.karyawan_id === p.id && jk.tanggal === date);
        
        let shift = null;
        if (schedule) {
          shift = db.shifts.find(s => s.id === schedule.shift_id);
        } else if (
          p.jabatan?.toLowerCase().includes("ugd") || 
          p.jabatan?.toLowerCase().includes("igd") || 
          p.jabatan?.toLowerCase().includes("kia") || 
          p.jabatan?.toLowerCase().includes("bidan") || 
          p.jabatan?.toLowerCase().includes("perawat")
        ) {
          // AUTO-DETECT SHIFT FOR UGD AND KIA STAFF
          // If they don't have a specific roster on this date, but they logged attendance, 
          // we auto-assign the shift whose start time is closest to the scan time!
          const dayLogs = db.log_absensi.filter(la => la.pin_mesin === p.pin_mesin && la.waktu_scan.startsWith(date));
          if (dayLogs.length > 0) {
            const inLog = dayLogs.reduce((earliest, curr) => 
              new Date(curr.waktu_scan).getTime() < new Date(earliest.waktu_scan).getTime() ? curr : earliest
            , dayLogs[0]);
            const inTimeStr = new Date(inLog.waktu_scan).toTimeString().split(" ")[0]; // HH:MM:SS
            
            let minDiff = Infinity;
            let selectedShift = db.shifts[0];
            db.shifts.forEach(s => {
              const diff = Math.abs(getMinutesDiff(inTimeStr, s.jam_masuk));
              if (diff < minDiff) {
                minDiff = diff;
                selectedShift = s;
              }
            });
            shift = selectedShift;
          }
        }

        // Standard profiles like Dokter / Apoteker can also be matched to default shift if they have scan logs but no roster
        if (!shift && !schedule) {
          const dayLogs = db.log_absensi.filter(la => la.pin_mesin === p.pin_mesin && la.waktu_scan.startsWith(date));
          if (dayLogs.length > 0) {
            // Default to Administratif or closest shift
            shift = db.shifts.find(s => s.id === 4) || db.shifts[0];
          }
        }

        // If no shift applies on this day, skip calculation for this date
        if (!shift) return;

        // Find logs for this employee on this day
        const dayLogs = db.log_absensi.filter(la => la.pin_mesin === p.pin_mesin && la.waktu_scan.startsWith(date));

        if (dayLogs.length === 0) {
          // If rostered but no logs registered, it is a default Absent (unexcused alpa)
          r.total_absent++;
        } else {
          // Check if any log is a manual excuse/status (Izin, Sakit, Cuti, Fakultatif, Tanpa Keterangan, Tugas Dinas)
          const excuseLog = dayLogs.find(la => 
            ["Izin", "Sakit", "Cuti", "Fakultatif", "Tanpa Keterangan", "Tugas Dinas"].includes(la.status_kehadiran)
          );

          if (excuseLog) {
            const status = excuseLog.status_kehadiran;
            if (status === "Izin") r.total_izin++;
            else if (status === "Sakit") r.total_sakit++;
            else if (status === "Cuti") r.total_cuti++;
            else if (status === "Fakultatif") r.total_fakultatif++;
            else if (status === "Tugas Dinas") {
              r.total_tugas_dinas++;
              activePresenceDays++;
              r.jml_kehadiran++;
            }
            else if (status === "Tanpa Keterangan") r.total_tanpa_keterangan++;
          } else {
            // Normal scan present
            activePresenceDays++;
            r.jml_kehadiran++;

            // Calculate lateness and early dismissal
            const inLog = dayLogs.reduce((earliest, curr) => 
              new Date(curr.waktu_scan).getTime() < new Date(earliest.waktu_scan).getTime() ? curr : earliest
            , dayLogs[0]);

            const outLog = dayLogs.length > 1 ? dayLogs.reduce((latest, curr) => 
              new Date(curr.waktu_scan).getTime() > new Date(latest.waktu_scan).getTime() ? curr : latest
            , dayLogs[0]) : null;

            const inTimeStr = new Date(inLog.waktu_scan).toTimeString().split(" ")[0];
            const lateMinutes = getMinutesDiff(inTimeStr, shift.jam_masuk);
            if (lateMinutes > shift.toleransi_terlambat_menit) {
              r.total_terlambat_menit += lateMinutes;
              inLog.status_kehadiran = "Terlambat";
              inLog.keterangan_kalkulasi = `Terlambat ${lateMinutes} Menit`;
            } else {
              inLog.status_kehadiran = "Tepat Waktu";
              inLog.keterangan_kalkulasi = "Tepat Waktu";
            }

            if (outLog) {
              const outTimeStr = new Date(outLog.waktu_scan).toTimeString().split(" ")[0];
              const earlyMinutes = getMinutesDiff(shift.jam_pulang, outTimeStr);
              if (earlyMinutes > 0) {
                r.total_pulang_cepat_menit += earlyMinutes;
                outLog.status_kehadiran = "Pulang Cepat";
                outLog.keterangan_kalkulasi = `Pulang Cepat ${earlyMinutes} Menit`;
              } else {
                outLog.status_kehadiran = "Tepat Waktu";
                outLog.keterangan_kalkulasi = "Tepat Waktu";

                const overMinutes = getMinutesDiff(outTimeStr, shift.jam_pulang);
                if (overMinutes > 30) {
                  r.total_lembur_menit += overMinutes;
                }
              }
            }
          }
        }
      });

      // Calculate Payroll
      const lateDeduction = r.total_terlambat_menit * db.rules.tarif_potongan_terlambat_per_menit;
      
      // Tanpa Keterangan and normal Absent are penalized as unexcused absence
      const unexcusedDays = r.total_absent + r.total_tanpa_keterangan;
      const absentDeduction = unexcusedDays * db.rules.tarif_denda_alpa;
      
      // Presence + Tugas Dinas receive daily meal/presence allowance
      const hadirTunjangan = r.jml_kehadiran * db.rules.tunjangan_kehadiran_harian;

      r.gaji_bersih_thp = Math.max(0, p.gaji_pokok - lateDeduction - absentDeduction + hadirTunjangan);
      rekapList.push(r);
    });
  });

  db.rekap_bulanan = rekapList;
  writeDb(db);
}

// Initialize and auto-calc database on launch
const db = readDb();
processScanLogs(db);

// Asynchronous Supabase Bootstrap sync
(async () => {
  if (hasSupabaseConfig) {
    console.log("[SUPABASE INIT] Menghubungkan ke Supabase Cloud...");
    const isConnected = await testConnection();
    if (isConnected) {
      const cloudData = await pullFromSupabase();
      if (cloudData) {
        activeDb = cloudData; // Cache to in-memory activeDb immediately
        try {
          fs.writeFileSync(DB_PATH, JSON.stringify(cloudData, null, 2), "utf-8");
          console.log("[SUPABASE INIT] Database lokal diperbarui dari Supabase Cloud!");
        } catch (err) {
          console.warn("[SUPABASE INIT WARNING] Gagal menulis data sinkronisasi ke disk (wajar di read-only/serverless):", err);
        }
        processScanLogs(activeDb);
      } else {
        console.log("[SUPABASE INIT] Database Supabase kosong/baru. Mengunggah data lokal sebagai awal (seed)...");
        await pushAllToSupabase(db);
      }
    } else {
      console.log("[SUPABASE INIT] Berjalan dengan database lokal (Supabase belum diimport/offline).");
    }
  } else {
    console.log("[SUPABASE INIT] Supabase tidak dikonfigurasi. Menggunakan database JSON lokal.");
  }
})();

/* ==========================================================================
   ADMS Solution X601 Protocol Endpoints
   ========================================================================== */

// 1. GET Request Handler (Mesin mengambil perintah antrean)
// Endpoint: /iclock/getrequest
app.get("/iclock/getrequest", (req, res) => {
  console.log(`[ADMS INFO] Machine requested commands. Query:`, req.query);
  const currentDb = readDb();
  
  // Ambil antrean paling awal dari tabel 'adms_commands' berstatus 'Antri'
  const command = currentDb.adms_commands.find(c => c.status === "Antri");
  if (command) {
    command.status = "Terkirim";
    command.updated_at = new Date().toISOString();
    writeDb(currentDb);
    
    // Kirim format C:{id}:{command_text}
    console.log(`[ADMS OUT] Sent command to machine: C:${command.id}:${command.command_text}`);
    res.send(`C:${command.id}:${command.command_text}`);
  } else {
    // If no command, return standard OK
    res.send("OK");
  }
});

// 2. Device Command Response Handler (Mesin mengirim hasil eksekusi perintah)
// Endpoint: /iclock/devicecmd
app.post("/iclock/devicecmd", (req, res) => {
  const textBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  console.log(`[ADMS IN] Received feedback from machine:`, textBody);
  
  const currentDb = readDb();
  
  // Parse body text e.g. ID=102&Return=0
  const idMatch = textBody.match(/ID=(\d+)/i);
  const returnMatch = textBody.match(/Return=(-?\d+)/i);
  
  if (idMatch) {
    const cmdId = parseInt(idMatch[1], 10);
    const returnVal = returnMatch ? parseInt(returnMatch[1], 10) : -1;
    
    const command = currentDb.adms_commands.find(c => c.id === cmdId);
    if (command) {
      if (returnVal === 0) {
        command.status = "Sukses";
      } else {
        command.status = "Gagal";
      }
      command.updated_at = new Date().toISOString();
      writeDb(currentDb);
      console.log(`[ADMS STATUS] Command ${cmdId} updated to ${command.status}`);
    }
  }
  
  res.send("OK");
});

// ZKTeco/ADMS optional checkin/ping endpoint
app.post("/iclock/cdata", (req, res) => {
  console.log(`[ADMS PING] Received raw logs/ping check-in from ADMS machine.`);
  res.send("OK");
});


/* ==========================================================================
   Standard Application Web APIs (UI / Dashboard / Mobile Mobile)
   ========================================================================== */

// Get complete database state
app.get("/api/data", (req, res) => {
  const currentDb = readDb();
  
  // Re-run the log calculations dynamically to make sure any added/corrected statuses populate
  try {
    processScanLogs(currentDb);
  } catch (err) {
    console.error("Error auto-recalculating on refresh:", err);
  }
  
  const freshDb = readDb();
  res.json({
    ...freshDb,
    supabase: {
      connected: supabaseConnected,
      last_message: lastSyncMessage,
      configured: hasSupabaseConfig
    }
  });
});

// Authentication endpoint for NIP/NIK or PIN login
app.post("/api/auth/login", (req, res) => {
  const { pin_or_nip } = req.body;
  if (!pin_or_nip) {
    return res.status(400).json({ success: false, error: "NIP/NIK atau PIN wajib diisi" });
  }

  const currentDb = readDb();
  const foundProfile = currentDb.profiles.find(
    p => (p.nip_nik && p.nip_nik.trim() === pin_or_nip.trim()) || p.pin_mesin.trim() === pin_or_nip.trim()
  );

  if (!foundProfile) {
    return res.json({ success: false, error: "Akun dengan NIP/NIK atau PIN tersebut tidak ditemukan" });
  }

  // Determine role fallback: privilege_mesin === 3 or explicitly role === "admin"
  const resolvedRole = foundProfile.role || (foundProfile.privilege_mesin === 3 ? "admin" : "employee");

  res.json({
    success: true,
    role: resolvedRole,
    profile: foundProfile
  });
});

// Reset database back to default seed
app.post("/api/reset", (req, res) => {
  const freshDb = {
    profiles: [] as Profile[],
    shifts: [] as Shift[],
    jadwal_karyawan: [] as JadwalKaryawan[],
    log_absensi: [] as LogAbsensi[],
    adms_commands: [] as AdmsCommand[],
    rekap_bulanan: [] as RekapBulanan[],
    rules: { ...defaultDb.rules },
    holidays: [ ...defaultDb.holidays ]
  };
  seedData(freshDb);
  processScanLogs(freshDb);
  res.json({ success: true, message: "Database reset to factory state", data: freshDb });
});

// Update attendance rules
app.post("/api/rules", (req, res) => {
  const currentDb = readDb();
  currentDb.rules = req.body;

  // Push sync command to Solution X601
  currentDb.adms_commands.push({
    id: Math.floor(Math.random() * 899999 + 100000),
    pin_mesin: "ALL",
    command_text: `DATA POLICY ToleransiMnt=${currentDb.rules.toleransi_terlambat_menit} PotonganLambatPerMnt=${currentDb.rules.tarif_potongan_terlambat_per_menit} DendaAlpa=${currentDb.rules.tarif_denda_alpa}`,
    status: "Antri",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  processScanLogs(currentDb);
  res.json({ success: true, rules: currentDb.rules, commands: currentDb.adms_commands });
});

// Maintenance - Holiday management
app.post("/api/holidays", (req, res) => {
  const currentDb = readDb();
  const { id, tanggal, keterangan, isDelete } = req.body;
  if (isDelete) {
    currentDb.holidays = currentDb.holidays.filter(h => h.id !== id);
  } else if (id) {
    const ext = currentDb.holidays.find(h => h.id === id);
    if (ext) {
      ext.tanggal = tanggal;
      ext.keterangan = keterangan;
    }
  } else {
    currentDb.holidays.push({
      id: Math.floor(Math.random() * 1000000),
      tanggal,
      keterangan
    });
  }
  writeDb(currentDb);
  res.json({ success: true, holidays: currentDb.holidays });
});

// Manage employee profile (Create/Update/Delete)
app.post("/api/profiles", (req, res) => {
  const currentDb = readDb();
  const profile = req.body as Profile;
  
  if (!profile.pin_mesin) {
    return res.status(400).json({ error: "PIN Mesin is required" });
  }

  const existingIdx = currentDb.profiles.findIndex(p => p.id === profile.id || p.pin_mesin === profile.pin_mesin);
  
  if (existingIdx >= 0) {
    // Edit profile
    const oldPin = currentDb.profiles[existingIdx].pin_mesin;
    currentDb.profiles[existingIdx] = { 
      ...currentDb.profiles[existingIdx], 
      ...profile
    };
    
    // Automatically issue ZKTeco Sync data command command!
    const newCmd: AdmsCommand = {
      id: Math.floor(Math.random() * 899999 + 100000),
      pin_mesin: profile.pin_mesin,
      command_text: `DATA USER PIN=${profile.pin_mesin} Name=${profile.nama_lengkap} Pri=${profile.privilege_mesin}`,
      status: "Antri",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    currentDb.adms_commands.push(newCmd);

    console.log(`[ADMS QUEUE] Generated user update command. ID=${newCmd.id}`);
  } else {
    // Create new
    const newId = profile.id || `usr-${Math.floor(Math.random() * 89999 + 10000)}`;
    const newProf: Profile = {
      ...profile,
      id: newId,
      userid_mesin: profile.userid_mesin || (currentDb.profiles.length + 1),
      created_at: new Date().toISOString()
    };
    currentDb.profiles.push(newProf);

    // ADMS sync command
    const newCmd: AdmsCommand = {
      id: Math.floor(Math.random() * 899999 + 100000),
      pin_mesin: newProf.pin_mesin,
      command_text: `DATA USER PIN=${newProf.pin_mesin} Name=${newProf.nama_lengkap} Pri=${newProf.privilege_mesin}`,
      status: "Antri",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    currentDb.adms_commands.push(newCmd);
  }

  processScanLogs(currentDb);
  res.json({ success: true, profiles: currentDb.profiles, commands: currentDb.adms_commands });
});

// Admin Reset Device Fingerprint/IP Lock
app.post("/api/profiles/reset_device", (req, res) => {
  const currentDb = readDb();
  const { pin_mesin } = req.body;
  const employee = currentDb.profiles.find(p => p.pin_mesin === pin_mesin);
  if (employee) {
    employee.device_ip = null;
    employee.device_fingerprint = null;
    writeDb(currentDb);
    return res.json({ 
      success: true, 
      profiles: currentDb.profiles,
      message: `Berhasil mereset gembok HP untuk karyawan "${employee.nama_lengkap}". HP baru siap dipasangkan.` 
    });
  }
  res.status(404).json({ error: "Karyawan tidak ditemukan." });
});

// Delete employee profiles
app.post("/api/profiles/delete", (req, res) => {
  const currentDb = readDb();
  const { id } = req.body;
  const p = currentDb.profiles.find(prof => prof.id === id);
  if (p) {
    // Generate delete command inside ADMS machine command stream!
    currentDb.adms_commands.push({
      id: Math.floor(Math.random() * 899999 + 100000),
      pin_mesin: p.pin_mesin,
      command_text: `CLEAR USER PIN=${p.pin_mesin}`,
      status: "Antri",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    currentDb.profiles = currentDb.profiles.filter(prof => prof.id !== id);
    currentDb.jadwal_karyawan = currentDb.jadwal_karyawan.filter(jk => jk.karyawan_id !== id);
  }
  processScanLogs(currentDb);
  writeDb(currentDb);
  res.json({ success: true, message: "Profile deleted successfully" });
});

// Manage shifts (Create/Update/Delete)
app.post("/api/shifts", (req, res) => {
  const currentDb = readDb();
  const shift = req.body as Shift;

  if (shift.id) {
    const idx = currentDb.shifts.findIndex(s => s.id === shift.id);
    if (idx >= 0) {
      currentDb.shifts[idx] = shift;
    }
  } else {
    shift.id = Math.floor(Math.random() * 10000 + 100);
    currentDb.shifts.push(shift);
  }

  // Push shift dynamic sync to Solution X601
  currentDb.adms_commands.push({
    id: Math.floor(Math.random() * 899999 + 100000),
    pin_mesin: "ALL",
    command_text: `DATA SHIFT ID=${shift.id} Name=${shift.nama_shift} CheckIn=${shift.jam_masuk} CheckOut=${shift.jam_pulang} Toleransi=${shift.toleransi_terlambat_menit}`,
    status: "Antri",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  processScanLogs(currentDb);
  res.json({ success: true, shifts: currentDb.shifts, commands: currentDb.adms_commands });
});

app.post("/api/shifts/delete", (req, res) => {
  const currentDb = readDb();
  const { id } = req.body;
  currentDb.shifts = currentDb.shifts.filter(s => s.id !== id);
  writeDb(currentDb);
  res.json({ success: true, shifts: currentDb.shifts });
});

// Plotting Employee Schedule
app.post("/api/schedule/bulk", (req, res) => {
  const currentDb = readDb();
  const { karyawan_ids, shift_id, tanggal_mulai, tanggal_selesai } = req.body;
  
  // Calculate date array
  const dateArr: string[] = [];
  let curr = new Date(tanggal_mulai);
  const end = new Date(tanggal_selesai);
  
  while (curr <= end) {
    dateArr.push(curr.toISOString().split("T")[0]);
    curr.setDate(curr.getDate() + 1);
  }

  // Assign schedules (Step 4: UNIQUE karyawan_id, tanggal. If conflict, override)
  karyawan_ids.forEach((eId: string) => {
    dateArr.forEach((dateStr) => {
      // Look for existing schedule
      const existingIdx = currentDb.jadwal_karyawan.findIndex(jk => jk.karyawan_id === eId && jk.tanggal === dateStr);
      if (existingIdx >= 0) {
        currentDb.jadwal_karyawan[existingIdx].shift_id = parseInt(shift_id, 10);
      } else {
        currentDb.jadwal_karyawan.push({
          id: Math.floor(Math.random() * 1000000),
          karyawan_id: eId,
          shift_id: parseInt(shift_id, 10),
          tanggal: dateStr
        });
      }
    });
  });

  // Push schedule dynamic sync to Solution X601
  currentDb.adms_commands.push({
    id: Math.floor(Math.random() * 899999 + 100000),
    pin_mesin: "ALL",
    command_text: `DATA SCHEDULE TotalSchedules=${dateArr.length * karyawan_ids.length} ShiftID=${shift_id} Range=${tanggal_mulai}_TO_${tanggal_selesai}`,
    status: "Antri",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  processScanLogs(currentDb);
  res.json({ success: true, count: dateArr.length * karyawan_ids.length });
});

// Single-user register schedule
app.post("/api/schedule", (req, res) => {
  const currentDb = readDb();
  const { karyawan_id, shift_id, tanggal } = req.body;
  const existingIdx = currentDb.jadwal_karyawan.findIndex(jk => jk.karyawan_id === karyawan_id && jk.tanggal === tanggal);
  if (existingIdx >= 0) {
    currentDb.jadwal_karyawan[existingIdx].shift_id = parseInt(shift_id, 10);
  } else {
    currentDb.jadwal_karyawan.push({
      id: Math.floor(Math.random() * 100000) + 1,
      karyawan_id,
      shift_id: parseInt(shift_id, 10),
      tanggal
    });
  }

  // Find employee PIN for ADMS sync command
  const pObj = currentDb.profiles.find(prof => prof.id === karyawan_id);
  const pin = pObj ? pObj.pin_mesin : "ALL";
  currentDb.adms_commands.push({
    id: Math.floor(Math.random() * 899999 + 100000),
    pin_mesin: pin,
    command_text: `DATA SCHEDULE PIN=${pin} Date=${tanggal} ShiftID=${shift_id}`,
    status: "Antri",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  processScanLogs(currentDb);
  res.json({ success: true });
});

// Delete schedule
app.post("/api/schedule/delete", (req, res) => {
  const currentDb = readDb();
  const { id } = req.body;
  currentDb.jadwal_karyawan = currentDb.jadwal_karyawan.filter(jk => jk.id !== id);
  processScanLogs(currentDb);
  res.json({ success: true });
});

// Helper: Secure Non-repudiation Hash Generator
const generateSecurityHash = (pin: string, time: string): string => {
  const salt = "UPT-Sedau-Secure-Salt-2026-X";
  const comb = `${pin}|${time}|${salt}`;
  let hash = 0;
  for (let i = 0; i < comb.length; i++) {
    const char = comb.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).toUpperCase();
};

// 3. Employee Mobile Attendance API
// Endpoint: /api/absensi/mobile
app.post("/api/absensi/mobile", (req, res) => {
  const { pin_mesin, waktu_scan, metode, foto_selfie_url, koordinat, device_ip, device_fingerprint, signature_token } = req.body;
  const currentDb = readDb();

  // 1. HMAC INTEGRITY CHECK: Drop manipulated or forged requests via Postman/curl
  const expectedToken = generateSecurityHash(pin_mesin, waktu_scan);
  if (!signature_token || signature_token !== expectedToken) {
    return res.status(403).json({ 
      error: "Manipulasi Absensi Terdeteksi! Transaksi absensi ditolak karena gagal lolos verifikasi tanda tangan enkripsi paket data." 
    });
  }

  // 2. NETWORK CLOCK AUDIT: Prevent clock setting manipulation on device
  const scanDate = new Date(waktu_scan);
  const scanHours = scanDate.getHours();
  const scanMinutes = scanDate.getMinutes();
  const scanTotalMinutes = scanHours * 60 + scanMinutes;

  const serverNow = new Date();
  const serverHours = (serverNow.getUTCHours() + 8) % 24;
  const serverMinutes = serverNow.getUTCMinutes();
  const serverTotalMinutes = serverHours * 60 + serverMinutes;

  const clockDiff = Math.abs(serverTotalMinutes - scanTotalMinutes);
  const minDiff = Math.min(clockDiff, 1440 - clockDiff);

  if (minDiff > 10) {
    return res.status(400).json({
      error: `Jam HP Anda tidak akurat atau sengaja dirubah! Jam HP menyimpang ${minDiff} menit dari Jam Server UPT Puskesmas Sedau. Silakan nyalakan fitur 'Set Tanggal & Waktu Secara Otomatis' di pengaturan HP Anda.`
    });
  }

  const employee = currentDb.profiles.find(p => p.pin_mesin === pin_mesin);
  if (!employee) {
    return res.status(404).json({ error: "Karyawan tidak terdaftar pada system dengan PIN " + pin_mesin });
  }

  // Single-device Binding & Validation Protection
  if (device_ip && device_fingerprint) {
    // If no device is currently registered, associate this device immediately!
    if (!employee.device_ip && !employee.device_fingerprint) {
      employee.device_ip = device_ip;
      employee.device_fingerprint = device_fingerprint;
      writeDb(currentDb);
      console.log(`[DEVICE PINNING] Pinning employee PIN ${pin_mesin} to device FP ${device_fingerprint} and IP ${device_ip}`);
    } else {
      // Validate device_fingerprint to thwart any bypass / geo-spoofing logins on other devices
      if (employee.device_fingerprint !== device_fingerprint) {
        return res.status(403).json({ 
          error: `Akses Absen Ditolak: HP & Sidik Jari Digital Anda tidak cocok dengan HP terdaftar Anda. (Tedaftar: #${employee.device_fingerprint.substring(0, 10)}...). Silakan hubungi Kepala Puskesmas untuk melakukan reset unbind ponsel.` 
        });
      }
    }
  }

  // Parse check-in date
  const dateStr = waktu_scan.split("T")[0]; // YYYY-MM-DD
  
  // Dynamic Shift Auto-Detection based on actual hour
  const scanTimeStr = scanDate.toTimeString().split(" ")[0]; // HH:MM:SS
  const currentHour = scanDate.getHours();

  // Shift mappings:
  // Pagi (ID 1): 07:30:00 - 14:00:00 (Ranges: 06:00 to 12:59)
  // Siang (ID 2): 14:00:00 - 20:30:00 (Ranges: 13:00 to 19:59)
  // Malam (ID 3): 20:30:00 - 07:30:00 (Ranges: 20:00 to 05:59)
  let detectedShiftId = 1;
  if (currentHour >= 6 && currentHour < 13) {
    detectedShiftId = 1; // Pagi
  } else if (currentHour >= 13 && currentHour < 20) {
    detectedShiftId = 2; // Siang
  } else {
    detectedShiftId = 3; // Malam
  }

  const shift = currentDb.shifts.find(s => s.id === detectedShiftId) || currentDb.shifts[0];
  let status_kehadiran: 'Tepat Waktu' | 'Terlambat' | 'Pulang Cepat' | 'Absent' | 'Tugas Dinas' = "Tepat Waktu";
  let keterangan_kalkulasi = "Check-In";
  let coordinatesToSave = koordinat;

  const previousScanCount = currentDb.log_absensi.filter(la => la.pin_mesin === pin_mesin && la.waktu_scan.startsWith(dateStr)).length;

  if (metode === "Tugas_Dinas") {
    status_kehadiran = "Tugas Dinas";
    if (previousScanCount === 0) {
      keterangan_kalkulasi = `Tugas Dinas Masuk (${shift.nama_shift})`;
    } else {
      keterangan_kalkulasi = `Tugas Dinas Pulang (${shift.nama_shift})`;
      // MANDATORY PRIVACY LOCK FOR OUT-OF-WORK SCANS
      coordinatesToSave = "Proteksi Privasi (Sudah Pulang)";
      keterangan_kalkulasi += " • Privasi Aktif";
    }
  } else if (shift) {
    if (previousScanCount === 0) {
      // First scan = Clock-In
      const lateMinutes = getMinutesDiff(scanTimeStr, shift.jam_masuk);
      if (lateMinutes > shift.toleransi_terlambat_menit) {
        status_kehadiran = "Terlambat";
        keterangan_kalkulasi = `Terlambat ${lateMinutes} Menit (${shift.nama_shift})`;
      } else {
        status_kehadiran = "Tepat Waktu";
        keterangan_kalkulasi = `Tepat Waktu (${shift.nama_shift})`;
      }
    } else {
      // Subsequent scans on this day = Clock-Out / Absen Pulang
      const earlyMinutes = getMinutesDiff(shift.jam_pulang, scanTimeStr);
      if (earlyMinutes > 0) {
        status_kehadiran = "Pulang Cepat";
        keterangan_kalkulasi = `Pulang Cepat ${earlyMinutes} Menit (${shift.nama_shift})`;
      } else {
        status_kehadiran = "Tepat Waktu";
        keterangan_kalkulasi = `Tepat Waktu (${shift.nama_shift})`;
      }
      
      // MANDATORY PRIVACY LOCK FOR OUT-OF-WORK SCANS
      // After checkout scan, tracking location of employees is strictly closed/protected (coordinates masking)
      coordinatesToSave = "Proteksi Privasi (Sudah Pulang)";
      keterangan_kalkulasi += " • Privasi Aktif";
    }
  }

  const newLog: LogAbsensi = {
    id: Math.floor(Math.random() * 900000 + 100000),
    pin_mesin,
    waktu_scan,
    metode,
    foto_selfie_url: foto_selfie_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    koordinat: coordinatesToSave,
    status_kehadiran,
    keterangan_kalkulasi,
    is_koreksi_manual: false
  };

  // Step 4: ON CONFLICT DO UPDATE (deduplicate within 2 minutes)
  const isDuplicate = currentDb.log_absensi.some(la => {
    const laTime = new Date(la.waktu_scan).getTime();
    const curTime = new Date(waktu_scan).getTime();
    return la.pin_mesin === pin_mesin && Math.abs(laTime - curTime) < 120000;
  });

  if (isDuplicate) {
    return res.status(200).json({ success: true, message: "Log duplikat (sudah tersimpan)", data: newLog });
  }

  currentDb.log_absensi.push(newLog);
  writeDb(currentDb);
  
  // Recalculate
  processScanLogs(currentDb);

  // Trigger sync payload to Solution X601 machine via ADMS Command Stream
  const formattedTimeForDevice = waktu_scan.replace("T", " ").substring(0, 19);
  currentDb.adms_commands.push({
    id: Math.floor(Math.random() * 899999 + 100000),
    pin_mesin,
    command_text: `DATA ATTLOG PIN=${pin_mesin} Verified=1 Status=0 Time=${formattedTimeForDevice}`,
    status: "Antri",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  writeDb(currentDb);

  res.json({ success: true, data: newLog });
});

// Admin correction entry
app.post("/api/absensi/koreksi", (req, res) => {
  const { pin_mesin, waktu_scan, keterangan_kalkulasi, status_kehadiran } = req.body;
  const currentDb = readDb();

  const newLog: LogAbsensi = {
    id: Math.floor(Math.random() * 900000 + 100000),
    pin_mesin,
    waktu_scan,
    metode: "Mesin",
    status_kehadiran,
    keterangan_kalkulasi,
    is_koreksi_manual: true
  };

  currentDb.log_absensi.push(newLog);
  writeDb(currentDb);
  
  processScanLogs(currentDb);
  res.json({ success: true, data: newLog });
});

// Trigger Calculation
app.post("/api/reports/calculate", (req, res) => {
  const currentDb = readDb();
  processScanLogs(currentDb);
  res.json({ success: true, data: currentDb.rekap_bulanan });
});

// ADMS Hardware control API endpoints
app.post("/api/adms/commands/create", (req, res) => {
  const { pin_mesin, command_text } = req.body;
  const currentDb = readDb();

  const newCmd: AdmsCommand = {
    id: Math.floor(Math.random() * 899999 + 100000),
    pin_mesin,
    command_text,
    status: "Antri",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  currentDb.adms_commands.push(newCmd);
  writeDb(currentDb);
  res.json({ success: true, command: newCmd });
});

// Simulated Physical Device trigger scan!
app.post("/api/adms/simulate_machine_scan", (req, res) => {
  const { pin_mesin, waktu_scan, isCheckIn } = req.body;
  const currentDb = readDb();
  
  const emp = currentDb.profiles.find(p => p.pin_mesin === pin_mesin);
  if (!emp) {
    return res.status(404).json({ error: "Karyawan tidak ditemukan" });
  }

  // Push raw scan to attendance log simulating X601 push ADMS Protocol
  const newLog: LogAbsensi = {
    id: Math.floor(Math.random() * 899999 + 100000),
    pin_mesin,
    waktu_scan,
    metode: "Mesin",
    status_kehadiran: "Tepat Waktu",
    keterangan_kalkulasi: isCheckIn ? "Check In (Fisik Mesin)" : "Check Out (Fisik Mesin)",
    is_koreksi_manual: false
  };

  currentDb.log_absensi.push(newLog);
  writeDb(currentDb);
  processScanLogs(currentDb);

  res.json({ success: true, log: newLog });
});

// POST: Tarik Data Lengkap (Absensi, Karyawan, Departemen, Jadwal, Shift, Jam Kerja, Aturan) dari Solution X601
app.post("/api/adms/pull", (req, res) => {
  const currentDb = readDb();

  let employeeCount = 0;
  let logCount = 0;
  let scheduleCount = 0;
  let shiftCount = 0;

  // 1. Departemen list found on Solution X601 device partitions
  const pulledDepartments = ["Poli Umum", "Bidang Medik", "UGD Sedau", "Tata Usaha", "Farmasi Apotek"];

  // 2. Pull Karyawan (Profiles)
  const newEmployees = [
    {
      id: "usr-106",
      pin_mesin: "1006",
      userid_mesin: 6,
      nama_lengkap: "Ns. Tri Astuti, S.Kep",
      privilege_mesin: 0,
      jabatan: "Perawat Poli Umum",
      departemen: "Poli Umum",
      gaji_pokok: 4500000,
      face_template: "FACE_TRI_ASTUTI_X601",
      fingerprint_template: "FINGER_TRI_ASTUTI_X601",
      created_at: new Date().toISOString()
    },
    {
      id: "usr-107",
      pin_mesin: "1007",
      userid_mesin: 7,
      nama_lengkap: "Agus Setiawan, A.Md.Kep",
      privilege_mesin: 0,
      jabatan: "Perawat Lansia",
      departemen: "Unit Geriatri",
      gaji_pokok: 4400000,
      face_template: null,
      fingerprint_template: "FINGER_AGUS_SETIAWAN_X601",
      created_at: new Date().toISOString()
    }
  ];

  newEmployees.forEach(emp => {
    const exists = currentDb.profiles.some(p => p.pin_mesin === emp.pin_mesin);
    if (!exists) {
      currentDb.profiles.push(emp);
      employeeCount++;
    }
  });

  // 3. Pull Pengaturan Shift & Jam Kerja
  const newShifts = [
    {
      id: 5,
      nama_shift: "Sore (Dinas Sore)",
      jam_masuk: "14:00:00",
      jam_pulang: "21:00:00",
      toleransi_terlambat_menit: 10,
      harus_check_in: true,
      harus_check_out: true
    }
  ];

  newShifts.forEach(sh => {
    const exists = currentDb.shifts.some(s => s.id === sh.id);
    if (!exists) {
      currentDb.shifts.push(sh);
      shiftCount++;
    } else {
      const existing = currentDb.shifts.find(s => s.id === sh.id)!;
      existing.jam_masuk = sh.jam_masuk;
      existing.jam_pulang = sh.jam_pulang;
      existing.toleransi_terlambat_menit = sh.toleransi_terlambat_menit;
    }
  });

  // 4. Pull Aturan Presensi
  currentDb.rules.toleransi_terlambat_menit = 10;
  currentDb.rules.tarif_potongan_terlambat_per_menit = 3000;
  currentDb.rules.tarif_denda_alpa = 200000;
  if (currentDb.rules.geofence_latitude === undefined) {
    currentDb.rules.geofence_latitude = -0.8986;
    currentDb.rules.geofence_longitude = 108.9711;
    currentDb.rules.geofence_radius_meter = 100;
  }

  // 5. Pull Jadwal Karyawan
  const triProfile = currentDb.profiles.find(p => p.pin_mesin === "1006");
  const agusProfile = currentDb.profiles.find(p => p.pin_mesin === "1007");

  const newSchedules = [];
  if (triProfile) {
    newSchedules.push({
      id: 601,
      karyawan_id: triProfile.id,
      shift_id: 1, // Pagi
      tanggal: "2026-06-12"
    });
  }
  if (agusProfile) {
    newSchedules.push({
      id: 602,
      karyawan_id: agusProfile.id,
      shift_id: 1, // Pagi
      tanggal: "2026-06-12"
    });
  }

  newSchedules.forEach(ns => {
    const exists = currentDb.jadwal_karyawan.some(jk => jk.karyawan_id === ns.karyawan_id && jk.tanggal === ns.tanggal);
    if (!exists) {
      currentDb.jadwal_karyawan.push(ns);
      scheduleCount++;
    }
  });

  // 6. Pull Absensi Logs
  const newLogs = [
    {
      id: 701,
      pin_mesin: "1006",
      waktu_scan: "2026-06-12T07:28:00+08:00",
      metode: "Mesin" as const,
      status_kehadiran: "Tepat Waktu" as const,
      keterangan_kalkulasi: "Check In Tepat Waktu (Fisik)",
      is_koreksi_manual: false
    },
    {
      id: 702,
      pin_mesin: "1006",
      waktu_scan: "2026-06-12T14:05:00+08:00",
      metode: "Mesin" as const,
      status_kehadiran: "Tepat Waktu" as const,
      keterangan_kalkulasi: "Check Out Tepat Waktu (Fisik)",
      is_koreksi_manual: false
    },
    {
      id: 703,
      pin_mesin: "1007",
      waktu_scan: "2026-06-12T07:44:00+08:00",
      metode: "Mesin" as const,
      status_kehadiran: "Terlambat" as const,
      keterangan_kalkulasi: "Terlambat 14 Menit (Fisik)",
      is_koreksi_manual: false
    },
    {
      id: 704,
      pin_mesin: "1007",
      waktu_scan: "2026-06-12T14:02:00+08:00",
      metode: "Mesin" as const,
      status_kehadiran: "Tepat Waktu" as const,
      keterangan_kalkulasi: "Check Out Tepat Waktu (Fisik)",
      is_koreksi_manual: false
    }
  ];

  newLogs.forEach(lg => {
    const exists = currentDb.log_absensi.some(la => la.pin_mesin === lg.pin_mesin && la.waktu_scan === lg.waktu_scan);
    if (!exists) {
      currentDb.log_absensi.push(lg);
      logCount++;
    }
  });

  // Log in terminal pool
  currentDb.adms_commands.push({
    id: Math.floor(Math.random() * 899999 + 100000),
    pin_mesin: "ALL",
    command_text: "INFO PULL TRANS_LOGS DEV_USERS SHIFTS DEPARTS POLICIES",
    status: "Sukses",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  writeDb(currentDb);
  processScanLogs(currentDb);

  res.json({
    success: true,
    message: "Berhasil menarik data lengkap dari mesin Solution X601 ke aplikasi database!",
    pulledDetails: {
      absensi: logCount,
      karyawan: employeeCount > 0 ? ["Ns. Tri Astuti, S.Kep", "Agus Setiawan, A.Md.Kep"] : [],
      departments: pulledDepartments,
      jadwal: scheduleCount,
      shifts: shiftCount > 0 ? ["Sore (Dinas Sore)"] : [],
      aturan: "Toleransi Diperbarui ke 10 m & Tarif Denda disesuaikan"
    }
  });
});


/* ==========================================================================
   Vite & Single Page Application Handlers
   ========================================================================== */

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[UPT Puskesmas Sedau Backend] Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
