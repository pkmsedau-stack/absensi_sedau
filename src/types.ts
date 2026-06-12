export interface Profile {
  id: string;
  pin_mesin: string;
  userid_mesin: number;
  nama_lengkap: string;
  privilege_mesin: number; // 0: User Biasa, 3: Admin Mesin
  jabatan: string;
  departemen: string;
  face_template?: string | null;
  fingerprint_template?: string | null;
  gaji_pokok: number;
  created_at: string;
  role?: "admin" | "employee";
  nip_nik?: string;
  status_kepegawaian?: 'PNS' | 'PPPK Penuh Waktu' | 'PPPK Paruh Waktu' | 'PKWT';
  device_ip?: string | null;
  device_fingerprint?: string | null;
}

export interface Shift {
  id: number;
  nama_shift: string;
  jam_masuk: string; // HH:MM:SS
  jam_pulang: string; // HH:MM:SS
  toleransi_terlambat_menit: number;
  harus_check_in: boolean;
  harus_check_out: boolean;
}

export interface JadwalKaryawan {
  id: number;
  karyawan_id: string;
  shift_id: number;
  tanggal: string; // YYYY-MM-DD
}

export interface LogAbsensi {
  id: number;
  pin_mesin: string;
  waktu_scan: string; // ISO string with timezone (WITA +08:00)
  metode: 'Mesin' | 'HP_Radius' | 'HP_Luar' | 'Tugas_Dinas';
  foto_selfie_url?: string | null;
  koordinat?: string | null; // "lat,lng"
  status_kehadiran: 'Tepat Waktu' | 'Terlambat' | 'Pulang Cepat' | 'Absent' | 'Tugas Dinas' | 'Izin' | 'Sakit' | 'Cuti' | 'Fakultatif' | 'Tanpa Keterangan';
  keterangan_kalkulasi?: string | null;
  is_koreksi_manual: boolean;
}

export interface AdmsCommand {
  id: number;
  pin_mesin: string;
  command_text: string;
  status: 'Antri' | 'Terkirim' | 'Sukses' | 'Gagal';
  created_at: string;
  updated_at: string;
}

export interface RekapBulanan {
  id: number;
  pin_mesin: string;
  bulan_tahun: string; // YYYY-MM
  hari_normal_kerja: number;
  jml_kehadiran: number;
  total_terlambat_menit: number;
  total_pulang_cepat_menit: number;
  total_absent: number;
  total_lembur_menit: number;
  gaji_bersih_thp: number;
  total_izin: number;
  total_sakit: number;
  total_cuti: number;
  total_fakultatif: number;
  total_tugas_dinas: number;
  total_tanpa_keterangan: number;
}

export interface AttendanceRule {
  toleransi_terlambat_menit: number;
  tarif_potongan_terlambat_per_menit: number; // Rp
  tarif_denda_alpa: number; // Rp
  lembur_mulai_menit: number;
  tunjangan_kehadiran_harian: number; // Rp
  geofence_latitude?: number;
  geofence_longitude?: number;
  geofence_radius_meter?: number;
}

export interface Holiday {
  id: number;
  tanggal: string; // YYYY-MM-DD
  keterangan: string;
}
