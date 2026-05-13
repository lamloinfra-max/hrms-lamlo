# Panduan Deployment di Ubuntu Local Server (Docker + Cloudflare Tunnel)

Aplikasi **Payslip Generator** ini dibangun 100% menggunakan arsitektur *Client-Side* (Vanilla JS, HTML, CSS) tanpa backend atau database demi menjamin keamanan dan privasi data gaji.

Untuk mendeploynya ke server Ubuntu lokal Anda yang sudah memiliki Docker dan Cloudflare Tunnel, kita akan menyajikannya (*serve*) menggunakan Nginx Web Server versi ringan di dalam Docker Container.

## Langkah-langkah Instalasi Docker

1. **Pindahkan File Project ke Server Ubuntu**
   Pastikan seluruh file project ini (termasuk `index.html`, `Dockerfile`, `docker-compose.yml`, folder `js/`, `css/`, dll) sudah berada di dalam server Ubuntu Anda. Misalnya di direktori `/opt/hrms-lamlo/`.

2. **Jalankan Docker Compose**
   Masuk ke direktori project di terminal Ubuntu:
   ```bash
   cd /opt/hrms-lamlo
   ```
   Lalu *build* dan jalankan container di *background* menggunakan perintah:
   ```bash
   docker-compose up -d --build
   ```

3. **Verifikasi Container Berjalan**
   Pastikan aplikasi berjalan lancar di port `8080` (sesuai konfigurasi di `docker-compose.yml`).
   ```bash
   docker ps
   ```
   Status container `lamlo-payslip-app` seharusnya **Up**. Jika Anda mengakses `http://<IP-Lokal-Ubuntu>:8080` dari jaringan lokal, aplikasi Payslip Generator sudah bisa terbuka.

## Langkah-langkah Routing Cloudflare Tunnel

Karena Anda sudah memiliki Cloudflare Tunnel yang terinstal (`cloudflared`), Anda hanya perlu melakukan *routing* agar domain publik Anda mengarah ke aplikasi ini.

**Jika Anda mengelola Tunnel via Cloudflare Dashboard (Zero Trust):**
1. Buka [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/).
2. Masuk ke menu **Networks** > **Tunnels**.
3. Pilih tunnel Anda dan klik **Configure**.
4. Masuk ke tab **Public Hostname** dan klik **Add a public hostname**.
5. Isi konfigurasi sebagai berikut:
   * **Subdomain**: (misal) `payslip`
   * **Domain**: `lamlopharmacy.com` (Pilih domain Anda)
   * **Service Type**: `HTTP`
   * **URL**: `localhost:8080` (atau IP lokal Ubuntu `127.0.0.1:8080`)
6. Klik **Save hostname**.

**Jika Anda mengelola Tunnel via CLI/Config file (`config.yml`):**
Tambahkan *ingress rule* baru di `config.yml` milik cloudflared Anda:
```yaml
ingress:
  - hostname: payslip.lamlopharmacy.com
    service: http://localhost:8080
  # (Ingress rule untuk aplikasi lain...)
  - service: http_status:404
```
Lalu restart service cloudflared:
```bash
sudo systemctl restart cloudflared
```

## Keamanan Tambahan (Opsional namun Direkomendasikan)
Meskipun aplikasi ini tidak mengirimkan data gaji ke server mana pun (semua diproses di browser), siapapun yang memiliki akses URL dapat melihat antarmuka generator.

Jika ini dipublikasikan via Cloudflare Tunnel, Anda **sangat disarankan** untuk mengaktifkan **Cloudflare Access (Zero Trust Access Application)** di depan URL tersebut (misal `payslip.lamlopharmacy.com`). Dengan begitu, hanya staf HRD yang masuk/login menggunakan email perusahaan (atau One-Time PIN) yang dapat mengakses halaman generator ini.
