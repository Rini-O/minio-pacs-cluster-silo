
import { check } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

import {
  AWSConfig,
  S3Client,
} from 'https://jslib.k6.io/aws/0.14.0/s3.js';

// =====================================
// 1. KONFIGURASI SILO CLUSTER
// =====================================

const config = new AWSConfig({
  region: 'us-east-1',
  accessKeyId: __ENV.AWS_ACCESS_KEY_ID,
  secretAccessKey: __ENV.AWS_SECRET_ACCESS_KEY,
  endpoint: __ENV.S3_ENDPOINT,
});

const s3 = new S3Client(config);
const bucket = 'pacs-medical';

// Membaca gambar X-ray dalam format biner
const image = open('./x-ray-8470739_960_720.jpg', 'b');

// =====================================
// 2. METRIK PENGUJIAN
// =====================================

const uploadDuration = new Trend('upload_response_time');
const downloadDuration = new Trend('download_response_time');

const uploadErrors = new Rate('upload_error_rate');
const downloadErrors = new Rate('download_error_rate');

const uploadRequests = new Counter('upload_requests');
const downloadRequests = new Counter('download_requests');

// =====================================
// 3. PENGATURAN LOAD TEST
// =====================================

export const options = {
  vus: Number(__ENV.VUS || 1),
  duration: __ENV.DURATION || '10s',
};

// =====================================
// 4. PROSES UPLOAD DAN DOWNLOAD
// =====================================

export default async function () {

  // Nama file unik untuk setiap iterasi
  const key = `xray-${__VU}-${__ITER}.jpg`;

  // ===================================
  // A. UPLOAD GAMBAR
  // ===================================

  uploadRequests.add(1);

  const uploadStart = Date.now();
  let uploadSuccess = false;

  try {
    const upload = await s3.putObject(
      bucket,
      key,
      image,
      { contentType: 'image/jpeg' }
    );

    uploadSuccess =
      upload !== null && upload !== undefined;

    check(upload, {
      'upload gambar berhasil': (res) =>
        res !== null && res !== undefined,
    });

  } catch (error) {
    console.error(`Upload gagal: ${error}`);
  }

  uploadDuration.add(Date.now() - uploadStart);
  uploadErrors.add(uploadSuccess ? 0 : 1);

  // Jika upload gagal, iterasi tidak dilanjutkan
  if (!uploadSuccess) {
    return;
  }

  // ===================================
  // B. DOWNLOAD GAMBAR
  // ===================================

  downloadRequests.add(1);

  const downloadStart = Date.now();
  let downloadSuccess = false;

  try {
    const download = await s3.getObject(
      bucket,
      key,
      {
        Accept: 'application/octet-stream',
      }
    );

    const data = download?.data;

    // Mengukur ukuran data hasil download
    let downloadedSize = 0;

    if (data instanceof ArrayBuffer) {
      downloadedSize = data.byteLength;
    } else if (ArrayBuffer.isView(data)) {
      downloadedSize = data.byteLength;
    }

    // Validasi ukuran hasil download dengan file asli
    downloadSuccess =
      downloadedSize === image.byteLength;

    // Debug pada iterasi pertama setiap VU
    if (__ITER === 0) {
      console.log('Tipe data:', typeof data);
      console.log('Ukuran hasil download:', downloadedSize);
      console.log('Ukuran gambar asli:', image.byteLength);
      console.log('Metadata ukuran:', download?.size);
    }

    check(download, {
      'download gambar berhasil': () =>
        downloadSuccess,
    });

  } catch (error) {
    console.error(`Download gagal: ${error}`);
  }

  downloadDuration.add(Date.now() - downloadStart);
  downloadErrors.add(downloadSuccess ? 0 : 1);
}
