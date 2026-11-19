# MinIO Distributed Cluster Template (Medical PACS Storage)

Template konfigurasi klaster terdistribusi **MinIO** menggunakan Docker Compose yang dirancang khusus untuk kebutuhan penyimpanan objek medis (*Picture Archiving and Communication System* / **PACS**). Proyek ini sudah dilengkapi dengan struktur data multi-node, konfigurasi *Identity and Access Management* (IAM), serta *bucket* awal untuk citra medis.

## Arsitektur Sistem

Berdasarkan struktur direktori `cluster-data/`, klaster ini menggunakan arsitektur terdistribusi (*Distributed Mode* / *Erasure Coding*) dengan spesifikasi berikut:

* **Multi-Node Setup:** Terdiri dari minimal 3 *node* (`node1`, `node2`, `node3`, dan seterusnya).
* **Multi-Drive per Node:** Setiap *node* memiliki beberapa *mount point* penyimpanan (`data1`, `data2`, dst.) untuk menjamin *High Availability* dan toleransi kegagalan perangkat keras (*Erasure Code*).
* **Pre-configured Bucket:** Tersedia *bucket* `pacs-medical` yang siap digunakan untuk menyimpan file citra medis (seperti DICOM, JPG, dll).

## Konfigurasi IAM (Users & Policies)

Klaster ini telah dikonfigurasi dengan pemisahan hak akses (*Role-Based Access Control*) yang sesuai dengan alur kerja sistem informasi medis dan pengujian performa:

| Username | Policy Terkait | Deskripsi Peran |
| :--- | :--- | :--- |
| `admin` | *Built-in Admin* | Administrator penuh untuk pengelolaan klaster, *bucket*, dan pengguna. |
| `dokter` | `dokter-policy` | Akses baca/tulis terbatas untuk dokter yang meninjau hasil pencitraan medis. |
| `radiolog` | `radiolog-policy` | Akses pengelolaan dan unggah hasil pemindaian radiologi ke *bucket* PACS. |
| `k6tester` | `k6-policy` | Akun khusus untuk pengujian beban (*load testing*) menggunakan **Grafana k6**. |

## Struktur Direktori

```text
minio-compose-template-main/
├── .dockerignore           # Daftar file yang diabaikan saat build Docker
├── .env                    # Variabel lingkungan (kredensial root, port, dll.)
├── .gitignore              # Daftar file yang diabaikan oleh Git
├── docker-compose.yml      # Definisi layanan klaster MinIO & Load Balancer (jika ada)
└── cluster-data/           # Penyimpanan persisten (persistent volume) untuk setiap node
    ├── node1/
    │   ├── data1/          # Drive 1 pada Node 1 (berisi .minio.sys & bucket pacs-medical)
    │   └── data2/          # Drive 2 pada Node 1
    ├── node2/
    │   ├── data1/          # Drive 1 pada Node 2
    │   └── data2/          # Drive 2 pada Node 2
    └── node3/
        ├── data1/          # Drive 1 pada Node 3
        └── data2/          # Drive 2 pada Node 3
```

## Prasyarat

* [Docker](https://docs.docker.com/get-docker/) (versi 20.10 atau lebih baru)
* [Docker Compose](https://docs.docker.com/compose/install/) (v2.0 atau lebih baru)

## Cara Menjalankan

1. **Ekstrak atau Clone Repositori**
   Pastikan Anda berada di dalam direktori utama proyek:
   ```bash
   cd minio-compose-template-main
   ```

2. **Periksa Konfigurasi Environment**
   Buka file `.env` untuk memastikan kredensial *root* (`MINIO_ROOT_USER` dan `MINIO_ROOT_PASSWORD`) sudah sesuai dengan konfigurasi yang tersimpan di dalam metadata `cluster-data/`:
   ```bash
   cat .env
   ```

3. **Jalankan Klaster**
   Mulai seluruh *container* di latar belakang (*detached mode*):
   ```bash
   docker compose up -d
   ```

4. **Akses Konsol Web MinIO**
   Buka *browser* dan akses antarmuka web MinIO (umumnya berjalan pada port `9001` untuk Console dan `9000` untuk S3 API, sesuaikan dengan file Compose Anda):
   * **MinIO Console:** `http://localhost:9001`
   * **S3 API Endpoint:** `http://localhost:9000`

## Catatan Keamanan & Pemeliharaan

* **Jangan Hapus `.minio.sys`:** Direktori `.minio.sys` di dalam setiap folder `data*` menyimpan metadata *erasure coding*, konfigurasi IAM (`dokter`, `radiolog`, `k6tester`), serta status *bucket*. Menghapus folder ini akan merusak integritas klaster.
* **Kredensial:** Karena direktori `cluster-data/` sudah membawa konfigurasi IAM bawaan, pastikan kata sandi untuk masing-masing pengguna (`dokter`, `radiolog`, `k6tester`) diatur ulang melalui MinIO Console atau MinIO Client (`mc`) sebelum digunakan di lingkungan produksi.
* **Git Ignore:** Pastikan folder `cluster-data/` ditambahkan ke dalam `.gitignore` jika Anda berencana melakukan *push* perubahan kode ke repositori publik agar data medis dan metadata konfigurasi tidak ikut terunggah.