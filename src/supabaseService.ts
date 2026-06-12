import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

// Check if credentials are set and valid URLs
export const supabaseClient = (() => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    // Validate that SUPABASE_URL looks like a valid absolute URL
    new URL(SUPABASE_URL);
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.warn("[SUPABASE INITIALIZATION ERROR] URL atau Anon Key Supabase salah/tidak didukung:", err);
    return null;
  }
})();

export const hasSupabaseConfig = !!supabaseClient;

// Global live state markers
export let supabaseConnected = false;
export let lastSyncMessage = hasSupabaseConfig
  ? "Menunggu koneksi pertama..."
  : "Supabase belum diinisialisasi. Pasang variabel di file .env.";

export function setSupabaseStatus(connected: boolean, message: string) {
  supabaseConnected = connected;
  lastSyncMessage = message;
}

// Test Connection
export async function testConnection(): Promise<boolean> {
  if (!supabaseClient) {
    supabaseConnected = false;
    lastSyncMessage = "Supabase tidak aktif: SUPABASE_URL & KEY kosong di environment.";
    return false;
  }
  try {
    const { data, error } = await supabaseClient.from("rules").select("id").limit(1);
    if (error) {
      console.warn("[SUPABASE WARNING] Terkoneksi tapi skema database belum siap:", error.message);
      supabaseConnected = false;
      lastSyncMessage = "Database skema belum di-import ke Supabase SQL Editor.";
      return false;
    }
    supabaseConnected = true;
    lastSyncMessage = "Sukses terhubung ke Supabase Cloud DB.";
    return true;
  } catch (err: any) {
    console.error("[SUPABASE CONN ERROR]", err.message || err);
    supabaseConnected = false;
    lastSyncMessage = "Offline: Gagal menghubungi server Supabase.";
    return false;
  }
}

// Push local JSON database state to Supabase
export async function pushAllToSupabase(db: any) {
  if (!supabaseClient) return;
  try {
    console.log("[SUPABASE SYNC] Sinkronisasi data lokal ke Supabase Cloud sedang berjalan...");
    
    // 1. Rules
    if (db.rules) {
      await supabaseClient.from("rules").upsert({ id: 1, ...db.rules });
    }

    // 2. Profiles
    if (db.profiles && db.profiles.length > 0) {
      // Ensure each profile is cleaned
      const sanitizedProfiles = db.profiles.map((p: any) => ({
        id: p.id,
        pin_mesin: p.pin_mesin,
        userid_mesin: p.userid_mesin || null,
        nama_lengkap: p.nama_lengkap,
        privilege_mesin: p.privilege_mesin || 0,
        jabatan: p.jabatan || "",
        departemen: p.departemen || "",
        gaji_pokok: p.gaji_pokok || 0,
        face_template: p.face_template || null,
        fingerprint_template: p.fingerprint_template || null,
        created_at: p.created_at || new Date().toISOString(),
        role: p.role || "employee",
        nip_nik: p.nip_nik || "",
        status_kepegawaian: p.status_kepegawaian || "PNS",
        device_fingerprint: p.device_fingerprint || null
      }));
      await supabaseClient.from("profiles").upsert(sanitizedProfiles);
    }

    // 3. Shifts
    if (db.shifts && db.shifts.length > 0) {
      const sanitizedShifts = db.shifts.map((s: any) => ({
        id: s.id,
        nama_shift: s.nama_shift,
        jam_masuk: s.jam_masuk,
        jam_pulang: s.jam_pulang,
        toleransi_terlambat_menit: s.toleransi_terlambat_menit || 15,
        harus_check_in: s.harus_check_in !== false,
        harus_check_out: s.harus_check_out !== false
      }));
      await supabaseClient.from("shifts").upsert(sanitizedShifts);
    }

    // 4. Jadwal Karyawan
    if (db.jadwal_karyawan && db.jadwal_karyawan.length > 0) {
      await supabaseClient.from("jadwal_karyawan").upsert(db.jadwal_karyawan);
    }

    // 5. Log Absensi
    if (db.log_absensi && db.log_absensi.length > 0) {
      const sanitizedLogs = db.log_absensi.map((l: any) => ({
        id: l.id,
        pin_mesin: l.pin_mesin,
        waktu_scan: l.waktu_scan,
        metode: l.metode,
        foto_selfie_url: l.foto_selfie_url || null,
        koordinat: l.koordinat || null,
        status_kehadiran: l.status_kehadiran || "Tepat Waktu",
        keterangan_kalkulasi: l.keterangan_kalkulasi || "",
        is_koreksi_manual: !!l.is_koreksi_manual
      }));
      await supabaseClient.from("log_absensi").upsert(sanitizedLogs);
    }

    // 6. ADMS Commands
    if (db.adms_commands && db.adms_commands.length > 0) {
      const sanitizedCmds = db.adms_commands.map((c: any) => ({
        id: c.id,
        pin_mesin: c.pin_mesin,
        command_text: c.command_text,
        status: c.status,
        created_at: c.created_at || new Date().toISOString(),
        updated_at: c.updated_at || new Date().toISOString()
      }));
      await supabaseClient.from("adms_commands").upsert(sanitizedCmds);
    }

    // 7. Rekap Bulanan
    if (db.rekap_bulanan && db.rekap_bulanan.length > 0) {
      await supabaseClient.from("rekap_bulanan").upsert(db.rekap_bulanan);
    }

    // 8. Holidays
    if (db.holidays && db.holidays.length > 0) {
      await supabaseClient.from("holidays").upsert(db.holidays);
    }

    console.log("[SUPABASE SYNC] Seluruh data lokal disinkronkan ke Supabase Cloud!");
    supabaseConnected = true;
    lastSyncMessage = `Tersinkronisasi Cloud: ${new Date().toLocaleTimeString()} WIB`;
  } catch (err: any) {
    console.error("[SUPABASE SYNC ERROR] Gagal sync data:", err.message || err);
    // don't mark completely offline unless backend ping physically fails, let connection remain but mark flag
    lastSyncMessage = `Gagal Sync: ${err.message || "Tabel belum lengkap"}`;
  }
}

// Pull entire data from Supabase Cloud to update local DB state
export async function pullFromSupabase() {
  if (!supabaseClient) return null;
  try {
    console.log("[SUPABASE SYNC] Menarik data dari Supabase Cloud...");
    
    const [
      resProfiles,
      resShifts,
      resJadwal,
      resLogs,
      resCommands,
      resRekap,
      resRules,
      resHolidays
    ] = await Promise.all([
      supabaseClient.from("profiles").select("*"),
      supabaseClient.from("shifts").select("*").order("id"),
      supabaseClient.from("jadwal_karyawan").select("*"),
      supabaseClient.from("log_absensi").select("*").order("id"),
      supabaseClient.from("adms_commands").select("*").order("id"),
      supabaseClient.from("rekap_bulanan").select("*"),
      supabaseClient.from("rules").select("*").eq("id", 1).maybeSingle(),
      supabaseClient.from("holidays").select("*").order("id")
    ]);

    // Validate table errors or read empty state
    if (resProfiles.error) throw resProfiles.error;
    if (resShifts.error) throw resShifts.error;
    if (resJadwal.error) throw resJadwal.error;
    if (resLogs.error) throw resLogs.error;
    if (resCommands.error) throw resCommands.error;
    if (resRekap.error) throw resRekap.error;
    if (resRules.error) throw resRules.error;
    if (resHolidays.error) throw resHolidays.error;

    // If database is completely unpopulated, return null so it can be seeded
    if (!resProfiles.data || resProfiles.data.length === 0) {
      console.log("[SUPABASE INFO] Database cloud Supabase kosong, mari kita seed.");
      return null;
    }

    let loadedRules = resRules.data;
    if (loadedRules) {
      delete loadedRules.id;
    }

    const compiledDb = {
      profiles: resProfiles.data || [],
      shifts: resShifts.data || [],
      jadwal_karyawan: resJadwal.data || [],
      log_absensi: resLogs.data || [],
      adms_commands: resCommands.data || [],
      rekap_bulanan: resRekap.data || [],
      rules: loadedRules || {
        toleransi_terlambat_menit: 15,
        tarif_potongan_terlambat_per_menit: 2000,
        tarif_denda_alpa: 150000,
        lembur_mulai_menit: 480,
        tunjangan_kehadiran_harian: 50000,
        geofence_latitude: -0.8986,
        geofence_longitude: 108.9711,
        geofence_radius_meter: 100
      },
      holidays: resHolidays.data || []
    };

    supabaseConnected = true;
    lastSyncMessage = `Cloud DB sinks OK`;
    return compiledDb;
  } catch (err: any) {
    console.warn("[SUPABASE INT PULL ERROR] Gagal load dari cloud:", err.message || err);
    supabaseConnected = false;
    lastSyncMessage = `Disinkronkan Lokal. Silakan import SQL ke Supabase: ${err.message || "Tabel tidak ditemukan"}`;
    return null;
  }
}
